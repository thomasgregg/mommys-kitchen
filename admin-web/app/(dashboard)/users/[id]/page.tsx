import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  const { supabase, profile: currentProfile } = await requireAdmin();
  const supabaseAdmin = createSupabaseAdminClient();
  const settings = await getAppSettings(currentProfile.tenant_id);

  const [{ data: profile }, { data: orders, error: ordersError }, { data: authUserData, error: authUserError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, tenant_id, full_name, phone, role")
      .eq("id", id)
      .eq("tenant_id", currentProfile.tenant_id)
      .single<Profile>(),
    supabase
      .from("orders")
      .select("id, order_number, status, created_at, total_cents, notes")
      .eq("user_id", id)
      .eq("tenant_id", currentProfile.tenant_id)
      .order("created_at", { ascending: false })
      .returns<UserOrderSummary[]>(),
    supabaseAdmin.auth.admin.getUserById(id),
  ]);

  if (!profile) {
    notFound();
  }

  if (ordersError) {
    throw new Error(ordersError.message);
  }

  if (authUserError) {
    throw new Error(authUserError.message);
  }

  const totalSpend = (orders ?? []).reduce((sum, order) => sum + order.total_cents, 0);
  const latestOrder = orders?.[0] ?? null;
  const email = authUserData.user?.email ?? null;

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

      <div className="space-y-4">
        <Card size="sm" className="border-border/70 bg-card shadow-sm">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Profile</CardTitle>
            <CardDescription>Read-only account details and current role.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4 md:grid-cols-2">
            <ReadOnlyField label="Full name" value={profile.full_name || "Unnamed profile"} />
            <ReadOnlyField label="Phone" value={profile.phone || "No phone on file"} />
            <ReadOnlyField label="Email" value={email || "No email on file"} />
            <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Role</p>
              <div className="mt-2">
                <Badge variant="outline" className={cn("border", roleBadgeClass(profile.role))}>
                  {profile.role}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card size="sm" className="border-border/70 bg-card shadow-sm">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Recent orders</CardTitle>
            <CardDescription>Order history stays available here while editing lives in the table sidebar.</CardDescription>
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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-medium text-foreground">{value}</p>
    </div>
  );
}
