"use client";

import { PencilLine, Plus } from "lucide-react";
import { useState } from "react";
import { CategoryForm } from "@/components/categories/category-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { MenuCategory } from "@/lib/types/app";

export function CategoryEditorSheet({
  category,
  iconOnly = false,
}: {
  category?: MenuCategory;
  iconOnly?: boolean;
}) {
  const isEditing = Boolean(category);
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
            {isEditing ? (iconOnly ? null : "Edit") : "New category"}
          </Button>
        }
      />
      <SheetContent side="right" className="w-full bg-background sm:max-w-md">
        <SheetHeader className="border-b border-border/70 pb-3 pr-12">
          <SheetTitle>{isEditing ? "Edit category" : "Create category"}</SheetTitle>
          <SheetDescription className="sr-only">
            {isEditing ? "Edit category details." : "Create a new category."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <CategoryForm
            category={category}
            variant="plain"
            submitLabel={isEditing ? "Save changes" : "Create category"}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
