"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function StatusFilterChip({
  label,
  value,
  icon,
  filterKey,
  filterValue,
  active = false,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  filterKey: string;
  filterValue: string;
  active?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleClick() {
    const params = new URLSearchParams(searchParams.toString());

    if (active) {
      params.delete(filterKey);
    } else {
      params.set(filterKey, filterValue);
    }

    const nextQueryString = params.toString();
    router.replace(nextQueryString ? `${pathname}?${nextQueryString}` : pathname, { scroll: false });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-sm hover:bg-slate-800"
          : "border-border/70 bg-background text-foreground hover:bg-slate-100",
      )}
      aria-pressed={active}
    >
      <span className={cn(active ? "text-white" : "text-muted-foreground")}>{icon}</span>
      <span className={cn(active ? "text-white/90" : "text-muted-foreground")}>{label}</span>
      <span className={cn("font-medium", active ? "text-white" : "text-foreground")}>{value}</span>
    </button>
  );
}
