"use client";

import { PencilLine } from "lucide-react";
import { ProfileAdminForm } from "@/components/users/profile-admin-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Profile } from "@/lib/types/app";

export function UserEditSheet({
  profile,
  triggerLabel = "Edit",
  iconOnly = false,
}: {
  profile: Profile;
  triggerLabel?: string;
  iconOnly?: boolean;
}) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant={iconOnly ? "ghost" : "outline"} size={iconOnly ? "icon-sm" : "sm"} className="rounded-lg">
            <PencilLine className="size-4" />
            {!iconOnly ? triggerLabel : null}
          </Button>
        }
      />
      <SheetContent side="right" className="w-full bg-background sm:max-w-lg">
        <SheetHeader className="border-b border-border/70 pb-3 pr-12">
          <SheetTitle>Edit user</SheetTitle>
          <SheetDescription className="sr-only">Edit the selected user.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <ProfileAdminForm profile={profile} variant="plain" submitLabel="Save profile" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
