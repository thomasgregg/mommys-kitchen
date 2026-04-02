"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { BooleanField } from "@/components/ui/boolean-field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitMenuCategoryAction } from "@/lib/actions/categories";
import type { MenuCategory } from "@/lib/types/app";
import { cn } from "@/lib/utils";

export function CategoryForm({
  category,
  variant = "card",
  submitLabel,
  onSuccess,
}: {
  category?: MenuCategory;
  variant?: "card" | "plain";
  submitLabel?: string;
  onSuccess?: () => void;
}) {
  const compact = variant === "plain";
  const fieldSpacing = compact ? "grid gap-2.5" : "space-y-4";
  const [state, formAction] = useActionState(submitMenuCategoryAction, null);
  const handledStateRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state) {
      return;
    }

    const stateKey = `${state.status}:${state.message}`;
    if (handledStateRef.current === stateKey) {
      return;
    }
    handledStateRef.current = stateKey;

    if (state.status === "success") {
      toast.success(state.message);
      onSuccess?.();
    } else {
      toast.error(state.message);
    }
  }, [onSuccess, state]);

  return (
    <form
      action={formAction}
      className={cn(
        "grid",
        compact ? "gap-3 sm:grid-cols-[minmax(0,1fr)_170px] sm:items-start" : "gap-4 md:grid-cols-2",
        variant === "card" && "rounded-3xl border border-border/70 bg-card/90 p-6 shadow-[0_16px_40px_rgba(57,39,24,0.06)]"
      )}
    >
      <input type="hidden" name="id" value={category?.id ?? ""} />

      <label className={fieldSpacing}>
        <span className="text-sm font-medium text-foreground">Name</span>
        <Input name="name" required defaultValue={category?.name ?? ""} placeholder="Favorites" className="h-9 rounded-xl bg-background" />
      </label>

      <label className={fieldSpacing}>
        <span className="text-sm font-medium text-foreground">Sort order</span>
        <Input
          name="sortOrder"
          type="number"
          min="0"
          required
          defaultValue={category?.sort_order ?? 0}
          className="h-9 rounded-xl bg-background"
        />
      </label>

      <BooleanField
        name="isActive"
        label="Visible in the customer app"
        description="Hidden categories stay in the database but disappear from the customer-facing menu."
        defaultChecked={category?.is_active ?? true}
        compact={compact}
        className={cn(compact && "sm:col-span-2", !compact && "md:col-span-2")}
      />

      <div className={cn("flex justify-end border-t border-border/60", compact ? "pt-2.5 sm:col-span-2" : "pt-3 md:col-span-2")}>
        <SubmitButton
          label={submitLabel ?? (category ? "Save category" : "Create category")}
          variant="outline"
          size="lg"
          className="h-10 min-w-44 rounded-xl px-5"
        />
      </div>
    </form>
  );
}
