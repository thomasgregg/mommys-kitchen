import Link from "next/link";
import { EyeOff, LayoutGrid } from "lucide-react";
import { CategoryEditorSheet } from "@/components/categories/category-editor-sheet";
import { OrdersFilterBar } from "@/components/orders/orders-filter-bar";
import { StatusFilterChip } from "@/components/orders/status-filter-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitAction } from "@/components/ui/confirm-submit-action";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteMenuCategoryAction, toggleMenuCategoryAction } from "@/lib/actions/categories";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { MenuCategory, MenuItem } from "@/lib/types/app";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; visibility?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();

  const [{ data: categories, error: categoriesError }, { data: items, error: itemsError }] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .returns<MenuCategory[]>(),
    supabase
      .from("menu_items")
      .select("id, category_id")
      .returns<Pick<MenuItem, "id" | "category_id">[]>(),
  ]);

  if (categoriesError) {
    throw new Error(categoriesError.message);
  }

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const itemCountByCategory = new Map<string, number>();
  for (const item of items ?? []) {
    itemCountByCategory.set(item.category_id, (itemCountByCategory.get(item.category_id) ?? 0) + 1);
  }

  const categoryRows = (categories ?? []).map((category) => ({
    ...category,
    linkedItems: itemCountByCategory.get(category.id) ?? 0,
  }));
  const activeCount = categoryRows.filter((category) => category.is_active).length;
  const hiddenCount = categoryRows.length - activeCount;
  const query = (params.q ?? "").trim().toLowerCase();
  const visibilityFilterParam = (params.visibility ?? "").trim();
  const visibilityFilter = visibilityFilterParam === "all" ? "" : visibilityFilterParam;
  const filteredCategories = categoryRows.filter((category) => {
    const matchesQuery = !query || category.name.toLowerCase().includes(query);
    const matchesVisibility =
      !visibilityFilter ||
      (visibilityFilter === "visible" && category.is_active) ||
      (visibilityFilter === "hidden" && !category.is_active);
    return matchesQuery && matchesVisibility;
  });

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Keep the customer menu structure tidy, hide sections cleanly, and only open a sheet when a category actually needs editing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button render={<Link href="/menu" />} nativeButton={false} variant="outline" size="lg">
            Menu
          </Button>
          <CategoryEditorSheet />
        </div>
      </section>

      <Card size="sm" className="border-border/70 bg-card/95 shadow-sm">
        <CardContent className="flex flex-col gap-4 pt-3">
          <div className="flex flex-wrap gap-2">
            <StatusFilterChip
              icon={<LayoutGrid className="size-4" />}
              label="Visible"
              value={String(activeCount)}
              filterKey="visibility"
              filterValue="visible"
              active={visibilityFilter === "visible"}
            />
            <StatusFilterChip
              icon={<EyeOff className="size-4" />}
              label="Hidden"
              value={String(hiddenCount)}
              filterKey="visibility"
              filterValue="hidden"
              active={visibilityFilter === "hidden"}
            />
          </div>
          <OrdersFilterBar initialQuery={params.q ?? ""} placeholder="Search categories" />
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Menu structure</CardTitle>
          <CardDescription>Hide a category to remove it from the customer app. Delete is only available after linked menu items are moved away.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {filteredCategories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-sm text-muted-foreground">
              {categoryRows.length === 0
                ? "No categories yet. Create the first one to structure the menu."
                : "No categories match the current filters."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Sort</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-medium text-foreground">{category.name}</p>
                        <p className="text-sm text-muted-foreground">{category.linkedItems > 0 ? String(category.linkedItems) + " linked items" : "No linked items"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{category.sort_order}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{category.linkedItems}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-full">
                        {category.is_active ? "Visible" : "Hidden"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <CategoryEditorSheet category={category} iconOnly />
                        <ConfirmSubmitAction
                          title="Delete category?"
                          description={
                            category.linkedItems > 0
                              ? "Move or remove linked menu items before deleting this category."
                              : `This permanently removes ${category.name} from the menu structure.`
                          }
                          confirmLabel="Delete category"
                          action={deleteMenuCategoryAction}
                          values={{ id: category.id }}
                          triggerLabel="Delete"
                          disabled={category.linkedItems > 0}
                        />
                        <form action={toggleMenuCategoryAction}>
                          <input type="hidden" name="id" value={category.id} />
                          <input type="hidden" name="isActive" value={String(category.is_active)} />
                          <SubmitButton label={category.is_active ? "Hide" : "Show"} variant="outline" size="sm" />
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

function StatChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
