"use client";

import { PencilLine, Plus } from "lucide-react";
import { useState } from "react";
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
  iconOnly = false,
}: {
  categories: MenuCategory[];
  item?: MenuItem;
  settings: Pick<AppSettings, "currency_code" | "locale_identifier">;
  iconOnly?: boolean;
}) {
  const isEditing = Boolean(item);
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
            onSuccess={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
