import Link from "next/link";
import { Ban, CheckCircle2, CircleOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrdersFilterBar } from "@/components/orders/orders-filter-bar";
import { StatusFilterChip } from "@/components/orders/status-filter-chip";
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
import { cn } from "@/lib/utils";
import { statusBadgeClass, statusLabel } from "@/lib/utils/admin-ui";
import { formatCurrency, formatDate } from "@/lib/utils/currency";

const terminalStatuses = ["completed", "cancelled", "rejected"] as const;

export default async function OrdersHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const { supabase, profile } = await requireAdmin();
  const settings = await getAppSettings(profile.tenant_id);

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_number, status, total_cents, created_at")
    .eq("tenant_id", profile.tenant_id)
    .in("status", terminalStatuses)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const query = (params.q ?? "").trim().toLowerCase();
  const statusFilterParam = (params.status ?? "").trim();
  const statusFilter = statusFilterParam === "all" ? "" : statusFilterParam;
  const filteredOrders = (orders ?? []).filter((order) => {
    const matchesStatus = !statusFilter || order.status === statusFilter;
    const matchesQuery = !query || `${order.order_number} ${order.status}`.toLowerCase().includes(query);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Order history</h1>
          <p className="text-sm text-muted-foreground">
            Review completed, cancelled, and rejected orders without leaving the operational dashboard flow.
          </p>
        </div>
        <Button render={<Link href="/orders" />} nativeButton={false} variant="outline" size="lg">
          Current orders
        </Button>
      </section>

      <Card size="sm" className="border-border/70 bg-card shadow-sm">
        <CardContent className="flex flex-col gap-4 pt-3">
          <div className="flex flex-wrap gap-2">
            <StatusFilterChip
              icon={<CheckCircle2 className="size-4" />}
              label="Completed"
              value={String((orders ?? []).filter((order) => order.status === "completed").length)}
              filterKey="status"
              filterValue="completed"
              active={statusFilter === "completed"}
            />
            <StatusFilterChip
              icon={<Ban className="size-4" />}
              label="Cancelled"
              value={String((orders ?? []).filter((order) => order.status === "cancelled").length)}
              filterKey="status"
              filterValue="cancelled"
              active={statusFilter === "cancelled"}
            />
            <StatusFilterChip
              icon={<CircleOff className="size-4" />}
              label="Rejected"
              value={String((orders ?? []).filter((order) => order.status === "rejected").length)}
              filterKey="status"
              filterValue="rejected"
              active={statusFilter === "rejected"}
            />
          </div>
          <OrdersFilterBar initialQuery={params.q ?? ""} placeholder="Search archived orders" />
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader className="gap-1 border-b border-border/70">
          <CardTitle>Archive table</CardTitle>
          <CardDescription>Terminal states stay queryable for customer support and operational review.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {filteredOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-sm text-muted-foreground">
              No archive entries match the current filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium text-foreground">{order.order_number}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(order.created_at, settings)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("border", statusBadgeClass(order.status))}>
                        {statusLabel(order.status)}
                      </Badge>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
