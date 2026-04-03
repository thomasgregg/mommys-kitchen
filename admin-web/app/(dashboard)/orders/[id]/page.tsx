import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock3, ReceiptText, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusActionForm } from "@/components/orders/status-action-form";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAppSettings } from "@/lib/data/app-settings";
import type { OrderHistoryEntry, OrderItem, OrderRecord, Profile } from "@/lib/types/app";
import { cn } from "@/lib/utils";
import { statusBadgeClass, statusLabel } from "@/lib/utils/admin-ui";
import { formatCurrency, formatDate } from "@/lib/utils/currency";

async function loadOrder(id: string): Promise<OrderRecord | null> {
  const { supabase, profile } = await requireAdmin();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", profile.tenant_id)
    .single();
  if (!order) return null;

  const [{ data: items }, { data: history }, { data: customer }] = await Promise.all([
    supabase
      .from("order_items")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .eq("order_id", id)
      .returns<OrderItem[]>(),
    supabase
      .from("order_status_history")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .eq("order_id", id)
      .order("created_at", { ascending: true })
      .returns<OrderHistoryEntry[]>(),
    supabase
      .from("profiles")
      .select("id, tenant_id, full_name, phone, role")
      .eq("id", order.user_id)
      .eq("tenant_id", profile.tenant_id)
      .single<Profile>(),
  ]);

  return {
    ...order,
    items: items ?? [],
    history: history ?? [],
    customer: customer ?? null,
  };
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireAdmin();
  const settings = await getAppSettings(profile.tenant_id);
  const order = await loadOrder(id);

  if (!order) {
    notFound();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.3fr_0.8fr]">
      <div className="flex flex-col gap-5">
        <Card className="border-border/70 bg-card shadow-sm">
          <CardHeader className="gap-4 border-b border-border/70 pb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">{order.order_number}</CardTitle>
                  <Badge variant="outline" className={cn("border", statusBadgeClass(order.status))}>
                    {statusLabel(order.status)}
                  </Badge>
                </div>
                <CardDescription>
                  Placed {formatDate(order.placed_at, settings)} • Total {formatCurrency(order.total_cents, settings)}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {order.customer ? (
                  <Button
                    render={<Link href={`/users/${order.customer.id}`} />}
                    nativeButton={false}
                    variant="outline"
                    size="default"
                  >
                    Open customer
                  </Button>
                ) : null}
                <Button
                  render={<Link href="/orders" />}
                  nativeButton={false}
                  variant="outline"
                  size="default"
                >
                  Current orders
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4 md:grid-cols-3">
            <InfoCard
              label="Customer"
              value={order.customer?.full_name ?? "Guest customer"}
              note={order.customer?.phone ?? "No phone on file"}
              icon={<UserRound className="size-4" />}
            />
            <InfoCard
              label="Estimated ready"
              value={order.estimated_ready_at ? formatDate(order.estimated_ready_at, settings) : "—"}
              note="Latest ETA from backend"
              icon={<Clock3 className="size-4" />}
            />
            <InfoCard
              label="Notes"
              value={order.notes || "No kitchen notes"}
              note="Captured at checkout"
              icon={<ReceiptText className="size-4" />}
            />
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle>Order record</CardTitle>
            <CardDescription>Items, totals, and immutable status history from the database.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Tabs defaultValue="items" className="gap-4">
              <TabsList variant="line">
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>

              <TabsContent value="items" className="flex flex-col gap-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{item.quantity}x {item.item_name_snapshot}</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(item.unit_price_cents, settings)} each</p>
                    </div>
                    <p className="font-medium text-foreground">{formatCurrency(item.quantity * item.unit_price_cents, settings)}</p>
                  </div>
                ))}
                <Separator />
                <div className="grid gap-2 rounded-xl border border-border/70 bg-background px-4 py-3">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatCurrency(order.subtotal_cents, settings)}</span>
                  </div>
                  <div className="flex items-center justify-between text-base font-medium text-foreground">
                    <span>Total</span>
                    <span>{formatCurrency(order.total_cents, settings)}</span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="flex flex-col gap-4">
                {order.history.length ? (
                  order.history.map((entry, index) => (
                    <div key={entry.id} className="flex gap-4 rounded-xl border border-border/70 bg-background px-4 py-3">
                      <div className="flex flex-col items-center">
                        <div className="mt-1 size-2.5 rounded-full bg-primary" />
                        {index < order.history.length - 1 ? <div className="mt-2 h-full w-px bg-border" /> : null}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <Badge variant="outline" className={cn("border", statusBadgeClass(entry.status))}>
                            {statusLabel(entry.status)}
                          </Badge>
                          <p className="text-sm text-muted-foreground">{formatDate(entry.created_at, settings)}</p>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{entry.note || "No note recorded."}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
                    No history entries yet.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-5">
        <Card className="border-border/70 bg-card shadow-sm xl:sticky xl:top-6">
          <CardHeader className="pb-3">
            <CardTitle>Update status</CardTitle>
            <CardDescription>
              Live orders can be advanced here. Completed, cancelled, and rejected orders become read-only.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <StatusActionForm orderId={order.id} currentStatus={order.status} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 font-medium text-foreground">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{note}</p>
        </div>
        <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-foreground">{icon}</div>
      </div>
    </div>
  );
}
