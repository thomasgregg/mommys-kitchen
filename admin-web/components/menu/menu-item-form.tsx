import { BooleanField } from "@/components/ui/boolean-field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { upsertMenuItemAction } from "@/lib/actions/menu";
import type { AppSettings, MenuCategory, MenuItem } from "@/lib/types/app";
import { cn } from "@/lib/utils";

export function MenuItemForm({
  categories,
  item,
  settings,
  variant = "card",
  submitLabel,
}: {
  categories: MenuCategory[];
  item?: MenuItem;
  settings: Pick<AppSettings, "currency_code" | "locale_identifier">;
  variant?: "card" | "plain";
  submitLabel?: string;
}) {
  const compact = variant === "plain";
  const priceLabel = `Price (${settings.currency_code})`;
  const priceValue = formatPriceInputValue(item?.price_cents ?? 0, settings.locale_identifier);

  return (
    <form
      action={upsertMenuItemAction}
      className={cn(
        "grid gap-4",
        compact && "sm:grid-cols-2 sm:items-start",
        !compact && "md:grid-cols-2",
        variant === "card" && "rounded-3xl border border-border/70 bg-card/90 p-6 shadow-[0_16px_40px_rgba(57,39,24,0.06)]"
      )}
    >
      <input type="hidden" name="id" defaultValue={item?.id ?? ""} />

      <label className="space-y-4">
        <span className="text-sm font-medium text-foreground">Name</span>
        <Input name="name" required defaultValue={item?.name ?? ""} className="h-9 rounded-xl bg-background" />
      </label>

      <label className="space-y-4">
        <span className="text-sm font-medium text-foreground">Category</span>
        <SelectField
          name="categoryId"
          defaultValue={item?.category_id ?? categories[0]?.id}
          options={categories.map((category) => ({ value: category.id, label: category.name }))}
          placeholder="Select category"
          className="h-9"
        />
      </label>

      <label className={cn("space-y-4", compact && "sm:col-span-2", !compact && "md:col-span-2")}>
        <span className="text-sm font-medium text-foreground">Description</span>
        <Textarea name="description" rows={4} required defaultValue={item?.description ?? ""} className="rounded-xl bg-background" />
      </label>

      <label className={cn("space-y-4", compact && "sm:col-span-2", !compact && "md:col-span-2")}>
        <span className="text-sm font-medium text-foreground">Image URL</span>
        <Input name="imageUrl" type="url" defaultValue={item?.image_url ?? ""} className="h-10 rounded-xl bg-background" />
      </label>

      <label className="space-y-4">
        <span className="text-sm font-medium text-foreground">{priceLabel}</span>
        <Input
          name="price"
          type="text"
          inputMode="decimal"
          required
          defaultValue={priceValue}
          placeholder="0.00"
          className="h-9 rounded-xl bg-background"
        />
      </label>

      <label className="space-y-4">
        <span className="text-sm font-medium text-foreground">Prep minutes</span>
        <Input name="prepMinutes" type="number" min="0" required defaultValue={item?.prep_minutes ?? 0} className="h-9 rounded-xl bg-background" />
      </label>

      <BooleanField
        name="isAvailable"
        label="Available"
        description="Shows up in the live customer menu and can be ordered right away."
        defaultChecked={item?.is_available ?? true}
        compact={compact}
        className={cn(compact && "sm:col-span-2")}
      />

      <BooleanField
        name="isFeatured"
        label="Featured"
        description="Highlights the item near the top of the menu in the customer app."
        defaultChecked={item?.is_featured ?? false}
        compact={compact}
        className={cn(compact && "sm:col-span-2")}
      />

      <div className={cn("flex justify-end border-t border-border/60 pt-3", compact && "sm:col-span-2", !compact && "md:col-span-2")}>
        <SubmitButton
          label={submitLabel ?? (item ? "Save item" : "Create item")}
          variant="outline"
          size="lg"
          className="h-10 min-w-44 rounded-xl px-5"
        />
      </div>
    </form>
  );
}

function formatPriceInputValue(cents: number, locale: string) {
  const value = cents / 100;
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  });

  return formatter.format(value);
}
