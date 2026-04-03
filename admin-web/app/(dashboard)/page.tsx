import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { OrdersOverTimeChart } from "@/components/dashboard/orders-over-time-chart";
import { OnboardingChecklistCard } from "@/components/onboarding/onboarding-checklist-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAppSettings } from "@/lib/data/app-settings";
import { getOnboardingSnapshot } from "@/lib/data/onboarding";
import type { OrderRecord, OrderStatus } from "@/lib/types/app";
import { cn } from "@/lib/utils";
import { statusBadgeClass, statusLabel } from "@/lib/utils/admin-ui";
import { buildDashboardStats } from "@/lib/utils/admin-dashboard";
import { formatCurrency, formatDate, formatDurationMinutes } from "@/lib/utils/currency";

type DashboardOrder = Pick<
  OrderRecord,
  | "id"
  | "order_number"
  | "status"
  | "created_at"
  | "placed_at"
  | "accepted_at"
  | "ready_at"
  | "completed_at"
  | "total_cents"
>;

const liveStatuses: OrderStatus[] = ["placed", "accepted", "preparing", "ready"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const { supabase, profile, user } = await requireAdmin();
  const [settings, onboarding] = await Promise.all([
    getAppSettings(profile.tenant_id),
    getOnboardingSnapshot(profile.tenant_id),
  ]);
  const rangeValue = normalizeRange(params.range);
  const displayName = profile.full_name?.trim() || fallbackNameFromEmail(user.email);

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_number, status, created_at, placed_at, accepted_at, ready_at, completed_at, total_cents")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false })
    .limit(1000)
    .returns<DashboardOrder[]>();

  if (error) {
    throw new Error(error.message);
  }

  const stats = buildDashboardStats(orders ?? [], rangeValue, settings.locale_identifier);
  const liveOrders = (orders ?? []).filter((order) => liveStatuses.includes(order.status)).slice(0, 6);
  const awaitingOrders = (orders ?? []).filter((order) => order.status === "placed").slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <OnboardingChecklistCard snapshot={onboarding} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Welcome back, {displayName}.
          </h1>
          <p className="text-sm text-muted-foreground">
            Watch order flow, response times, and Current Orders from one place.
          </p>
        </div>
        <DateRangePicker value={String(rangeValue)} />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_380px]">
        <div className="flex flex-col gap-4">
          <Card size="sm" className="border-border/70 bg-card shadow-sm">
            <CardHeader className="gap-1 border-b border-border/70">
              <CardTitle>Overview</CardTitle>
              <CardDescription>Key numbers for the currently selected time window.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryMetric label="Orders" value={String(stats.totalOrders)} note={`Last ${rangeValue} days`} />
                <SummaryMetric label="Revenue" value={formatCurrency(stats.revenueCents, settings)} note={`Last ${rangeValue} days`} />
                <SummaryMetric label="Average accept" value={formatDurationMinutes(stats.averageAcceptMinutes)} note="Kitchen response time" />
                <SummaryMetric label="Average fulfilment" value={formatDurationMinutes(stats.averageCompletionMinutes)} note="Placed to ready/completed" />
              </div>
            </CardContent>
          </Card>

          <Card size="sm" className="border-border/70 bg-card shadow-sm">
            <CardHeader>
              <CardTitle>Performance over time</CardTitle>
              <CardDescription>Switch between order count and revenue without leaving the dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <OrdersOverTimeChart data={stats.dailySeries} settings={settings} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card size="sm" className="border-border/70 bg-card shadow-sm">
            <CardHeader className="gap-1 border-b border-border/70">
              <CardTitle>Queue health</CardTitle>
              <CardDescription>What needs attention right now.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-4">
              <div className="grid grid-cols-2 gap-2">
                <CompactStat label="Placed" value={stats.statusBreakdown.placed} tone="warning" />
                <CompactStat label="Accepted" value={stats.statusBreakdown.accepted} tone="neutral" />
                <CompactStat label="Preparing" value={stats.statusBreakdown.preparing} tone="neutral" />
                <CompactStat label="Ready" value={stats.readyCount} tone="success" />
              </div>
              <Separator />
              <div className="grid gap-2">
                <Button render={<Link href="/orders?status=placed" />} nativeButton={false} variant="outline" size="lg" className="justify-between">
                  Accept an order
                  <ArrowRight data-icon="inline-end" />
                </Button>
                <Button render={<Link href="/orders" />} nativeButton={false} variant="outline" size="lg" className="justify-between">
                  Open Current Orders
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card size="sm" className="border-border/70 bg-card shadow-sm">
            <CardHeader>
              <CardTitle>Needs action</CardTitle>
              <CardDescription>Placed orders still waiting for a kitchen decision.</CardDescription>
              <CardAction>
                <Button render={<Link href="/orders?status=placed" />} nativeButton={false} variant="ghost" size="sm">
                  View all
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {awaitingOrders.length ? (
                awaitingOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-4 py-3 transition hover:border-primary/20 hover:bg-primary/5"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(order.created_at, settings)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{formatCurrency(order.total_cents, settings)}</p>
                      <Badge variant="outline" className={cn("mt-2 border", statusBadgeClass(order.status))}>
                        {statusLabel(order.status)}
                      </Badge>
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyState message="No orders are waiting for acceptance." />
              )}
            </CardContent>
          </Card>

          <Card size="sm" className="border-border/70 bg-card shadow-sm">
            <CardHeader>
              <CardTitle>Current Orders snapshot</CardTitle>
              <CardDescription>Recent active orders across all in-progress states.</CardDescription>
              <CardAction>
                <Button render={<Link href="/orders" />} nativeButton={false} variant="ghost" size="sm">
                  Open Current Orders
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {liveOrders.length ? (
                liveOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-4 py-3 transition hover:border-primary/20 hover:bg-primary/5"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(order.created_at, settings)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{formatCurrency(order.total_cents, settings)}</p>
                      <Badge variant="outline" className={cn("mt-2 border", statusBadgeClass(order.status))}>
                        {statusLabel(order.status)}
                      </Badge>
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyState message="No Current Orders right now." />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function normalizeRange(value?: string) {
  const parsed = Number(value ?? "7");
  if ([7, 14, 30, 90].includes(parsed)) {
    return parsed;
  }

  return 7;
}

function fallbackNameFromEmail(email?: string | null) {
  const localPart = email?.split("@")[0]?.trim();

  if (!localPart) {
    return "kitchen lead";
  }

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function SummaryMetric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{note}</p>
    </div>
  );
}

function CompactStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "bg-amber-50 text-amber-800"
      : tone === "success"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-secondary text-secondary-foreground";

  return (
    <div className={cn("rounded-xl border border-border/70 px-4 py-3", toneClass)}>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
