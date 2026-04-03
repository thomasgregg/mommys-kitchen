"use client";

import { PencilLine } from "lucide-react";
import { useState } from "react";
import { ProfileAdminForm } from "@/components/users/profile-admin-form";
import { UserPasswordForm } from "@/components/users/user-password-form";
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
  iconOnly = true,
}: {
  profile: Profile;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant={iconOnly ? "ghost" : "outline"} size={iconOnly ? "icon-sm" : "sm"} className="rounded-xl">
            <PencilLine className="size-4" />
            {iconOnly ? null : "Edit"}
          </Button>
        }
      />
      <SheetContent side="right" className="w-full bg-background sm:max-w-lg">
        <SheetHeader className="border-b border-border/70 pb-3 pr-12">
          <SheetTitle>Edit user</SheetTitle>
          <SheetDescription className="sr-only">Update the selected user profile and password.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <ProfileAdminForm
            profile={profile}
            submitLabel="Save changes"
            onSuccess={() => setOpen(false)}
          >
            <UserPasswordForm profile={profile} onSuccess={() => setOpen(false)} embedded />
          </ProfileAdminForm>
        </div>
      </SheetContent>
    </Sheet>
  );
}
