"use client";

import { Plus } from "lucide-react";
import { UserCreateForm } from "@/components/users/user-create-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function UserCreateSheet() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline" size="lg" className="rounded-xl">
            <Plus className="size-4" />
            New user
          </Button>
        }
      />
      <SheetContent side="right" className="w-full bg-background sm:max-w-lg">
        <SheetHeader className="border-b border-border/70 pb-3 pr-12">
          <SheetTitle>Create user</SheetTitle>
          <SheetDescription className="sr-only">Create a new customer or admin account.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <UserCreateForm />
        </div>
      </SheetContent>
    </Sheet>
  );
}
