import Link from "next/link";
import { ChefHat, Clock3, PackageCheck, TimerReset } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrdersFilterBar } from "@/components/orders/orders-filter-bar";
import { StatusFilterChip } from "@/components/orders/status-filter-chip";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateOrderStatusAction } from "@/lib/actions/orders";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAppSettings } from "@/lib/data/app-settings";
import type { OrderHistoryEntry, OrderItem, OrderRecord, OrderStatus, Profile } from "@/lib/types/app";
import { cn } from "@/lib/utils";
import { statusBadgeClass, statusLabel } from "@/lib/utils/admin-ui";
import { formatCurrency, formatDate } from "@/lib/utils/currency";

const queueStatuses: OrderStatus[] = ["placed", "accepted", "preparing", "ready"];

async function loadQueueOrders(): Promise<OrderRecord[]> {
  const { supabase } = await requireAdmin();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .in("status", queueStatuses)
    .order("created_at", { ascending: false });

  if (error || !orders) {
    throw new Error(error?.message ?? "Failed to load queue orders.");
  }

  const orderIds = orders.map((order) => order.id);
  const userIds = [...new Set(orders.map((order) => order.user_id))];

  const [{ data: items }, { data: history }, { data: profiles }] = await Promise.all([
    supabase.from("order_items").select("*").in("order_id", orderIds).returns<OrderItem[]>(),
    supabase.from("order_status_history").select("*").in("order_id", orderIds).returns<OrderHistoryEntry[]>(),
    supabase.from("profiles").select("id, full_name, phone, role").in("id", userIds).returns<Profile[]>(),
  ]);

  return orders.map((order) => ({
    ...order,
    items: (items ?? []).filter((item) => item.order_id === order.id),
    history: (history ?? []).filter((entry) => entry.order_id === order.id),
    customer: (profiles ?? []).find((profile) => profile.id === order.user_id) ?? null,
  }));
}

export default async function OrdersQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const settings = await getAppSettings();
  const orders = await loadQueueOrders();
  const query = (params.q ?? "").trim().toLowerCase();
  const statusFilterParam = (params.status ?? "").trim();
  const statusFilter = statusFilterParam === "all" ? "" : statusFilterParam;

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = !statusFilter || order.status === statusFilter;
    const haystack = [
      order.order_number,
      order.customer?.full_name ?? "",
      order.customer?.phone ?? "",
      order.items.map((item) => item.item_name_snapshot).join(" "),
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Current orders</h1>
          <p className="text-sm text-muted-foreground">
            Work the live queue from one dense table and open the full order record only when you need deeper context.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button render={<Link href="/orders/history" />} nativeButton={false} variant="outline" size="lg">
            Order history
          </Button>
        </div>
      </section>

      <Card size="sm" className="border-border/70 bg-card shadow-sm">
        <CardContent className="flex flex-col gap-4 pt-3">
          <div className="flex flex-wrap gap-2">
            <StatusFilterChip
              icon={<TimerReset className="size-4" />}
              label="Placed"
              value={String(orders.filter((order) => order.status === "placed").length)}
              filterKey="status"
              filterValue="placed"
              active={statusFilter === "placed"}
            />
            <StatusFilterChip
              icon={<Clock3 className="size-4" />}
              label="Accepted"
              value={String(orders.filter((order) => order.status === "accepted").length)}
              filterKey="status"
              filterValue="accepted"
              active={statusFilter === "accepted"}
            />
            <StatusFilterChip
              icon={<ChefHat className="size-4" />}
              label="Preparing"
              value={String(orders.filter((order) => order.status === "preparing").length)}
              filterKey="status"
              filterValue="preparing"
              active={statusFilter === "preparing"}
            />
            <StatusFilterChip
              icon={<PackageCheck className="size-4" />}
              label="Ready"
              value={String(orders.filter((order) => order.status === "ready").length)}
              filterKey="status"
              filterValue="ready"
              active={statusFilter === "ready"}
            />
          </div>
          <OrdersFilterBar
            initialQuery={params.q ?? ""}
          />
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader className="gap-1 border-b border-border/70">
          <CardTitle>Kitchen queue</CardTitle>
          <CardDescription>
            The database owns the state machine. These controls just advance it. Completed orders leave the live queue
            and move to order history.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {filteredOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-sm text-muted-foreground">
              {orders.length === 0 ? "The live queue is empty right now." : "No live orders match the current filters."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Next status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const primaryAction = getPrimaryAction(order.status);

                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="space-y-0.5 whitespace-normal">
                          <p className="font-medium text-foreground">{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">Placed {formatDate(order.created_at, settings)}</p>
                          <p className="text-sm text-muted-foreground">ETA {order.estimated_ready_at ? formatDate(order.estimated_ready_at, settings) : "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarFallback>{initials(order.customer?.full_name ?? null)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{order.customer?.full_name ?? "Guest customer"}</p>
                            <p className="truncate text-sm text-muted-foreground">{order.customer?.phone ?? "No phone"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[320px] whitespace-normal text-sm text-muted-foreground">
                        {order.items.map((item) => `${item.quantity}x ${item.item_name_snapshot}`).join(", ")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("border", statusBadgeClass(order.status))}>
                          {statusLabel(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{formatCurrency(order.total_cents, settings)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {primaryAction ? statusLabel(primaryAction.status) : "Done"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {primaryAction ? (
                            <form action={updateOrderStatusAction}>
                              <input type="hidden" name="orderId" value={order.id} />
                              <input type="hidden" name="newStatus" value={primaryAction.status} />
                              <SubmitButton label={primaryAction.label} size="sm" />
                            </form>
                          ) : null}
                          <Button render={<Link href={`/orders/${order.id}`} />} nativeButton={false} variant="ghost" size="sm">
                            Open
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getPrimaryAction(status: OrderStatus) {
  switch (status) {
    case "placed":
      return { status: "accepted", label: "Accept" };
    case "accepted":
      return { status: "preparing", label: "Start prep" };
    case "preparing":
      return { status: "ready", label: "Mark ready" };
    case "ready":
      return { status: "completed", label: "Mark complete" };
    default:
      return null;
  }
}

function initials(value: string | null) {
  if (!value) {
    return "MK";
  }

  return (
    value
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "MK"
  );
}
