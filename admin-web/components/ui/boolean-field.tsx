"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function BooleanField({
  name,
  label,
  description,
  defaultChecked = false,
  className,
  compact = false,
}: {
  name: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <label
      className={cn(
        "flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background px-4 py-3.5",
        compact && "rounded-xl border border-border/70 bg-white px-4 py-3.5",
        className
      )}
    >
      <input type="hidden" name={name} value={checked ? "on" : ""} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description ? <span className="block text-sm text-muted-foreground">{description}</span> : null}
      </div>
      <Switch checked={checked} onCheckedChange={setChecked} className="shrink-0 self-start mt-0.5" />
    </label>
  );
}
