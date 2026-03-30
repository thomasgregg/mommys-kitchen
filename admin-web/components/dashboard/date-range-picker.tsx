"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ranges = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

export function DateRangePicker({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateRange(nextValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", nextValue);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden rounded-2xl border border-border/70 bg-background/80 p-1 md:flex md:items-center md:gap-1">
        {ranges.map((range) => (
          <button
            key={range.value}
            type="button"
            onClick={() => updateRange(range.value)}
            className={cn(
              "rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
              value === range.value
                ? "bg-slate-950 text-white shadow-sm"
                : "text-foreground hover:bg-slate-100"
            )}
            aria-pressed={value === range.value}
          >
            {range.label}
          </button>
        ))}
      </div>

      <div className="md:hidden">
        <Select
          value={value}
          onValueChange={(nextValue) => {
            if (nextValue) {
              updateRange(nextValue);
            }
          }}
        >
          <SelectTrigger className="h-10 w-[140px] rounded-xl bg-background/80">
            <SelectValue placeholder="Range" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectGroup>
              {ranges.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
