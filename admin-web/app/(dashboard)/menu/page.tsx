import Link from "next/link";
import { Sparkles, Store, Timer } from "lucide-react";
import { MenuItemSheet } from "@/components/menu/menu-item-sheet";
import { OrdersFilterBar } from "@/components/orders/orders-filter-bar";
import { StatusFilterChip } from "@/components/orders/status-filter-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UrlSelectFilter } from "@/components/ui/url-select-filter";
import { toggleMenuAvailabilityAction } from "@/lib/actions/menu";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAppSettings } from "@/lib/data/app-settings";
import { hasSupabaseAdminAccess } from "@/lib/supabase/admin";
import type { MenuCategory, MenuItem } from "@/lib/types/app";
import { formatCurrency } from "@/lib/utils/currency";

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; availability?: string; category?: string; featured?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const settings = await getAppSettings();
  const hasPrivilegedAdmin = hasSupabaseAdminAccess();
  const params = await searchParams;

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase.from("menu_categories").select("*").order("sort_order", { ascending: true }).returns<MenuCategory[]>(),
    supabase.from("menu_items").select("*").returns<MenuItem[]>(),
  ]);

  const categoryById = new Map((categories ?? []).map((category) => [category.id, category.name]));
  const categorySortById = new Map((categories ?? []).map((category) => [category.id, category.sort_order]));
  const availableCount = (items ?? []).filter((item) => item.is_available).length;
  const soldOutCount = (items ?? []).filter((item) => !item.is_available).length;
  const featuredCount = (items ?? []).filter((item) => item.is_featured).length;
  const query = (params.q ?? "").trim().toLowerCase();
  const availabilityFilterParam = (params.availability ?? "").trim();
  const categoryFilterParam = (params.category ?? "").trim();
  const featuredFilterParam = (params.featured ?? "").trim();
  const availabilityFilter = availabilityFilterParam === "all" ? "" : availabilityFilterParam;
  const categoryFilter = categoryFilterParam === "all" ? "" : categoryFilterParam;
  const featuredFilter = featuredFilterParam === "all" ? "" : featuredFilterParam;
  const filteredItems = (items ?? [])
    .filter((item) => {
      const matchesQuery = !query || `${item.name} ${item.description}`.toLowerCase().includes(query);
      const matchesAvailability =
        !availabilityFilter ||
        (availabilityFilter === "available" && item.is_available) ||
        (availabilityFilter === "sold_out" && !item.is_available);
      const matchesCategory = !categoryFilter || item.category_id === categoryFilter;
      const matchesFeatured = !featuredFilter || (featuredFilter === "featured" && item.is_featured);
      return matchesQuery && matchesAvailability && matchesCategory && matchesFeatured;
    })
    .sort((left, right) => {
      const categoryOrderDelta =
        (categorySortById.get(left.category_id) ?? Number.MAX_SAFE_INTEGER) -
        (categorySortById.get(right.category_id) ?? Number.MAX_SAFE_INTEGER);

      if (categoryOrderDelta !== 0) {
        return categoryOrderDelta;
      }

      if (left.is_featured !== right.is_featured) {
        return left.is_featured ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Menu</h1>
          <p className="text-sm text-muted-foreground">
            Operate the live menu from one dense table, then open a sheet only when you need to edit copy, flags, or photos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button render={<Link href="/categories" />} nativeButton={false} variant="outline" size="lg">
            Categories
          </Button>
          <MenuItemSheet categories={categories ?? []} settings={settings} hasUploads={hasPrivilegedAdmin} />
        </div>
      </section>

      <Card size="sm" className="border-border/70 bg-card/95 shadow-sm">
        <CardContent className="flex flex-col gap-4 pt-3">
          <div className="flex flex-wrap gap-2">
            <StatusFilterChip
              icon={<Store className="size-4" />}
              label="Available"
              value={String(availableCount)}
              filterKey="availability"
              filterValue="available"
              active={availabilityFilter === "available"}
            />
            <StatusFilterChip
              icon={<Timer className="size-4" />}
              label="Sold out"
              value={String(soldOutCount)}
              filterKey="availability"
              filterValue="sold_out"
              active={availabilityFilter === "sold_out"}
            />
            <StatusFilterChip
              icon={<Sparkles className="size-4" />}
              label="Featured"
              value={String(featuredCount)}
              filterKey="featured"
              filterValue="featured"
              active={featuredFilter === "featured"}
            />
          </div>
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
            <OrdersFilterBar initialQuery={params.q ?? ""} placeholder="Search menu items" />
            <UrlSelectFilter
              queryKey="category"
              initialValue={categoryFilter || "all"}
              options={[
                { value: "all", label: "All categories" },
                ...((categories ?? []).map((category) => ({ value: category.id, label: category.name }))),
              ]}
              className="h-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Live menu items</CardTitle>
          <CardDescription>
            {hasPrivilegedAdmin
              ? "Image upload is enabled from the edit sheet."
              : "Direct image upload is not enabled in this local admin setup yet. You can still use the image URL field in the edit sheet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-sm text-muted-foreground">
              No matching menu items. Clear a filter or broaden the search.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Prep</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="size-10 rounded-lg border border-border/70 object-cover" />
                        ) : (
                          <div className="flex size-10 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-[11px] text-muted-foreground">
                            None
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{item.name}</p>
                          <p className="max-w-sm truncate text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{categoryById.get(item.category_id) ?? "Unknown"}</TableCell>
                    <TableCell className="font-medium text-foreground">{formatCurrency(item.price_cents, settings)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.prep_minutes} min</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {item.is_featured ? <Badge variant="secondary">Featured</Badge> : null}
                        {!item.is_featured ? <span className="text-sm text-muted-foreground">—</span> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-full">
                        {item.is_available ? "Available" : "Sold out"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <MenuItemSheet
                          categories={categories ?? []}
                          item={item}
                          settings={settings}
                          hasUploads={hasPrivilegedAdmin}
                          iconOnly
                        />
                        <form action={toggleMenuAvailabilityAction}>
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="isAvailable" value={String(item.is_available)} />
                          <SubmitButton
                            label={item.is_available ? "Sold out" : "Restore"}
                            variant="outline"
                            size="sm"
                          />
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
