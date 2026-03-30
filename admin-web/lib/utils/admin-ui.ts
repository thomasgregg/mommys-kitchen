import type { OrderStatus, ProfileRole } from "@/lib/types/app";

export function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/^[a-z]/, (value) => value.toUpperCase());
}

export function statusBadgeClass(status: OrderStatus) {
  switch (status) {
    case "placed":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "accepted":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "preparing":
      return "border-orange-200 bg-orange-50 text-orange-800";
    case "ready":
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "cancelled":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "rejected":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-border bg-secondary text-secondary-foreground";
  }
}

export function roleBadgeClass(role: ProfileRole) {
  return role === "admin"
    ? "border-slate-300 bg-slate-100 text-slate-700"
    : "border-border bg-secondary text-secondary-foreground";
}
