"use client";

import { PencilLine, Plus } from "lucide-react";
import { MenuImageUploadForm } from "@/components/menu/menu-image-upload-form";
import { MenuItemForm } from "@/components/menu/menu-item-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { AppSettings, MenuCategory, MenuItem } from "@/lib/types/app";

export function MenuItemSheet({
  categories,
  item,
  settings,
  hasUploads,
  iconOnly = false,
}: {
  categories: MenuCategory[];
  item?: MenuItem;
  settings: Pick<AppSettings, "currency_code" | "locale_identifier">;
  hasUploads: boolean;
  iconOnly?: boolean;
}) {
  const isEditing = Boolean(item);

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant={isEditing ? (iconOnly ? "ghost" : "outline") : "outline"}
            size={isEditing ? (iconOnly ? "icon-sm" : "sm") : "lg"}
            className="rounded-xl"
          >
            {isEditing ? <PencilLine className="size-4" /> : <Plus className="size-4" />}
            {isEditing ? (iconOnly ? null : "Edit") : "New item"}
          </Button>
        }
      />
      <SheetContent side="right" className="w-full bg-background sm:max-w-xl">
        <SheetHeader className="border-b border-border/70 pb-3 pr-12">
          <SheetTitle>{isEditing ? "Edit menu item" : "Create menu item"}</SheetTitle>
          <SheetDescription className="sr-only">
            {isEditing ? "Edit the selected menu item." : "Create a new menu item."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <MenuItemForm
            categories={categories}
            item={item}
            settings={settings}
            variant="plain"
            submitLabel={isEditing ? "Save changes" : "Create item"}
          />

          {item && hasUploads ? (
            <div className="rounded-xl border border-border/70 bg-white p-3">
              <div className="mb-2 space-y-1">
                <h3 className="text-sm font-semibold text-foreground">Photo</h3>
                <p className="text-sm text-muted-foreground">Upload a fresh image and the backend will update the item automatically.</p>
              </div>
              <MenuImageUploadForm item={item} isEnabled={hasUploads} />
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
