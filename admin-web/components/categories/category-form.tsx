import { BooleanField } from "@/components/ui/boolean-field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { upsertMenuCategoryAction } from "@/lib/actions/categories";
import type { MenuCategory } from "@/lib/types/app";
import { cn } from "@/lib/utils";

export function CategoryForm({
  category,
  variant = "card",
  submitLabel,
}: {
  category?: MenuCategory;
  variant?: "card" | "plain";
  submitLabel?: string;
}) {
  const compact = variant === "plain";

  return (
    <form
      action={upsertMenuCategoryAction}
      className={cn(
        "grid gap-4",
        compact && "sm:grid-cols-[minmax(0,1fr)_170px] sm:items-start",
        !compact && "md:grid-cols-2",
        variant === "card" && "rounded-3xl border border-border/70 bg-card/90 p-6 shadow-[0_16px_40px_rgba(57,39,24,0.06)]"
      )}
    >
      <input type="hidden" name="id" value={category?.id ?? ""} />

      <label className="space-y-4">
        <span className="text-sm font-medium text-foreground">Name</span>
        <Input name="name" required defaultValue={category?.name ?? ""} placeholder="Favorites" className="h-9 rounded-xl bg-background" />
      </label>

      <label className="space-y-4">
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

      <div className={cn("flex justify-end border-t border-border/60 pt-3", compact && "sm:col-span-2", !compact && "md:col-span-2")}>
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
