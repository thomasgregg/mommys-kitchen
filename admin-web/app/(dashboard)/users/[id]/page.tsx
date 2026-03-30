import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileAdminForm } from "@/components/users/profile-admin-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAppSettings } from "@/lib/data/app-settings";
import type { OrderRecord, Profile } from "@/lib/types/app";
import { cn } from "@/lib/utils";
import { roleBadgeClass, statusBadgeClass, statusLabel } from "@/lib/utils/admin-ui";
import { formatCurrency, formatDate } from "@/lib/utils/currency";

type UserOrderSummary = Pick<
  OrderRecord,
  "id" | "order_number" | "status" | "created_at" | "total_cents" | "notes"
>;

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const settings = await getAppSettings();

  const [{ data: profile }, { data: orders, error: ordersError }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone, role").eq("id", id).single<Profile>(),
    supabase
      .from("orders")
      .select("id, order_number, status, created_at, total_cents, notes")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .returns<UserOrderSummary[]>(),
  ]);

  if (!profile) {
    notFound();
  }

  if (ordersError) {
    throw new Error(ordersError.message);
  }

  const totalSpend = (orders ?? []).reduce((sum, order) => sum + order.total_cents, 0);
  const latestOrder = orders?.[0] ?? null;

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {profile.full_name || "Unnamed profile"}
            </h1>
            <Badge variant="outline" className={cn("border", roleBadgeClass(profile.role))}>
              {profile.role}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{profile.phone || "No phone on file"}</p>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <StatChip label="Orders" value={String(orders?.length ?? 0)} note="Total orders on this account" />
        <StatChip label="Lifetime total" value={formatCurrency(totalSpend, settings)} note="Confirmed order value" />
        <StatChip
          label="Latest order"
          value={latestOrder?.order_number ?? "—"}
          note={latestOrder ? formatDate(latestOrder.created_at, settings) : "No orders yet"}
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card size="sm" className="border-border/70 bg-card shadow-sm">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Profile</CardTitle>
            <CardDescription>Edit the name, phone number, and role from one place.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ProfileAdminForm profile={profile} variant="plain" submitLabel="Save changes" />
          </CardContent>
        </Card>

        <Card size="sm" className="border-border/70 bg-card shadow-sm">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Recent orders</CardTitle>
            <CardDescription>Use this customer record for quick support and role management without leaving the admin flow.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {orders?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-foreground">{order.order_number}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(order.created_at, settings)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("border", statusBadgeClass(order.status))}>
                          {statusLabel(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[320px] whitespace-normal text-sm text-muted-foreground">
                        {order.notes || "No kitchen notes"}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{formatCurrency(order.total_cents, settings)}</TableCell>
                      <TableCell className="text-right">
                        <Button render={<Link href={`/orders/${order.id}`} />} nativeButton={false} variant="ghost" size="sm">
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
                This customer has not placed an order yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="inline-flex min-w-[180px] flex-col gap-1 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tracking-tight text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{note}</p>
    </div>
  );
}
