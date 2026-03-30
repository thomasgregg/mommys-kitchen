import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusActionForm } from "@/components/orders/status-action-form";
import type { AppSettings, OrderRecord } from "@/lib/types/app";
import { cn } from "@/lib/utils";
import { statusBadgeClass, statusLabel } from "@/lib/utils/admin-ui";
import { formatCurrency, formatDate } from "@/lib/utils/currency";

export function OrderCard({
  order,
  settings,
}: {
  order: OrderRecord;
  settings: Pick<AppSettings, "currency_code" | "locale_identifier">;
}) {
  return (
    <Card className="border-border/70 bg-card/90 shadow-[0_14px_40px_rgba(57,39,24,0.06)]">
      <CardHeader className="gap-4 border-b border-border/60 pb-4 md:flex md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl tracking-tight">{order.order_number}</CardTitle>
            <Badge variant="outline" className={cn("border", statusBadgeClass(order.status))}>
              {statusLabel(order.status)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
        </div>

        <div className="space-y-2 text-left md:text-right">
          <p className="text-2xl font-semibold tracking-tight text-foreground">{formatCurrency(order.total_cents, settings)}</p>
          <Link href={`/orders/${order.id}`} className="text-sm font-medium text-primary hover:text-primary/80">
            View detail
          </Link>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 pt-5 md:grid-cols-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Customer</p>
          <p className="font-medium text-foreground">{order.customer?.full_name ?? "Guest"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Phone</p>
          <p className="text-sm text-foreground">{order.customer?.phone ?? "-"}</p>
        </div>
        <div className="space-y-1 md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Items</p>
          <p className="text-sm leading-6 text-foreground">
            {order.items.map((item) => `${item.quantity}x ${item.item_name_snapshot}`).join(", ")}
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-stretch gap-4 border-t border-border/60 bg-secondary/20">
        {order.customer ? (
          <div className="flex justify-end">
            <Link href={`/users/${order.customer.id}`} className="text-sm font-medium text-primary hover:text-primary/80">
              Open customer profile
            </Link>
          </div>
        ) : null}
        <StatusActionForm orderId={order.id} currentStatus={order.status} />
      </CardFooter>
    </Card>
  );
}
