import { defaultAppSettings } from "@/lib/constants/app-settings";
import type { AppSettings, OrderRecord, OrderStatus } from "@/lib/types/app";

type DashboardOrderLike = Pick<
  OrderRecord,
  "status" | "created_at" | "placed_at" | "accepted_at" | "ready_at" | "completed_at" | "total_cents"
>;

type DashboardStats = {
  totalOrders: number;
  revenueCents: number;
  averageAcceptMinutes: number | null;
  averageCompletionMinutes: number | null;
  awaitingAcceptanceCount: number;
  readyCount: number;
  dailySeries: Array<{
    key: string;
    label: string;
    orders: number;
    revenueCents: number;
  }>;
  statusBreakdown: Record<OrderStatus, number>;
};

const allStatuses: OrderStatus[] = [
  "placed",
  "accepted",
  "preparing",
  "ready",
  "completed",
  "cancelled",
  "rejected",
];

export function buildDashboardStats(
  orders: DashboardOrderLike[],
  days = 7,
  localeIdentifier: Pick<AppSettings, "locale_identifier">["locale_identifier"] = defaultAppSettings.locale_identifier
): DashboardStats {
  const now = new Date();
  const start = startOfDay(addDays(now, -(days - 1)));

  const series = new Map<string, { label: string; orders: number; revenueCents: number }>();
  for (let index = 0; index < days; index += 1) {
    const day = addDays(start, index);
    const key = day.toISOString().slice(0, 10);
    series.set(key, {
      label: formatDayLabel(day, days, localeIdentifier),
      orders: 0,
      revenueCents: 0,
    });
  }

  const statusBreakdown = Object.fromEntries(allStatuses.map((status) => [status, 0])) as Record<OrderStatus, number>;
  const recentOrders = orders.filter((order) => new Date(order.created_at) >= start);

  let revenueCents = 0;
  let acceptMinutesTotal = 0;
  let acceptMinutesCount = 0;
  let completionMinutesTotal = 0;
  let completionMinutesCount = 0;

  for (const order of recentOrders) {
    revenueCents += order.total_cents;
    statusBreakdown[order.status] += 1;

    const key = new Date(order.created_at).toISOString().slice(0, 10);
    const entry = series.get(key);
    if (entry) {
      entry.orders += 1;
      entry.revenueCents += order.total_cents;
    }

    if (order.accepted_at) {
      acceptMinutesTotal += minutesBetween(order.placed_at, order.accepted_at);
      acceptMinutesCount += 1;
    }

    if (order.completed_at) {
      completionMinutesTotal += minutesBetween(order.placed_at, order.completed_at);
      completionMinutesCount += 1;
    } else if (order.ready_at) {
      completionMinutesTotal += minutesBetween(order.placed_at, order.ready_at);
      completionMinutesCount += 1;
    }
  }

  return {
    totalOrders: recentOrders.length,
    revenueCents,
    averageAcceptMinutes: acceptMinutesCount ? Math.round(acceptMinutesTotal / acceptMinutesCount) : null,
    averageCompletionMinutes: completionMinutesCount ? Math.round(completionMinutesTotal / completionMinutesCount) : null,
    awaitingAcceptanceCount: orders.filter((order) => order.status === "placed").length,
    readyCount: orders.filter((order) => order.status === "ready").length,
    dailySeries: Array.from(series.entries()).map(([key, value]) => ({
      key,
      label: value.label,
      orders: value.orders,
      revenueCents: value.revenueCents,
    })),
    statusBreakdown,
  };
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function minutesBetween(startValue: string, endValue: string) {
  return Math.max(0, Math.round((new Date(endValue).getTime() - new Date(startValue).getTime()) / 60000));
}

function formatDayLabel(date: Date, days: number, localeIdentifier: string) {
  if (days <= 7) {
    return date.toLocaleDateString(localeIdentifier, { weekday: "short" });
  }

  if (days <= 31) {
    return date.toLocaleDateString(localeIdentifier, { month: "short", day: "numeric" });
  }

  return date.toLocaleDateString(localeIdentifier, { month: "short", day: "numeric" });
}
