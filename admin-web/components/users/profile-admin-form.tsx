"use client";

import type { ReactNode } from "react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateUserProfileAction } from "@/lib/actions/users";
import type { Profile, ProfileRole } from "@/lib/types/app";

const roles: ProfileRole[] = ["customer", "admin"];

export function ProfileAdminForm({
  profile,
  submitLabel = "Save profile",
  onSuccess,
  children,
}: {
  profile: Profile;
  submitLabel?: string;
  onSuccess?: () => void;
  children?: ReactNode;
}) {
  const [state, formAction] = useActionState(updateUserProfileAction, null);
  const handledStateRef = useRef<string | null>(null);
  const fieldGap = "grid gap-2.5";

  useEffect(() => {
    if (!state) {
      return;
    }

    const stateKey = `${state.status}:${state.message}`;
    if (handledStateRef.current === stateKey) {
      return;
    }
    handledStateRef.current = stateKey;

    if (state.status === "success") {
      toast.success(state.message);
      onSuccess?.();
    } else {
      toast.error(state.message);
    }
  }, [onSuccess, state]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={profile.id} />

      <div className="grid gap-3 sm:grid-cols-2 sm:items-start">
        <label className={fieldGap}>
          <span className="text-sm font-medium text-foreground">Full name</span>
          <Input
            name="fullName"
            defaultValue={profile.full_name ?? ""}
            placeholder="Peter"
            className="h-9 rounded-xl bg-background"
          />
        </label>

        <label className={fieldGap}>
          <span className="text-sm font-medium text-foreground">Phone</span>
          <Input
            name="phone"
            defaultValue={profile.phone ?? ""}
            placeholder="+49 ..."
            className="h-9 rounded-xl bg-background"
          />
        </label>

        <label className={fieldGap + " sm:col-span-2"}>
          <span className="text-sm font-medium text-foreground">Role</span>
          <SelectField
            name="role"
            defaultValue={profile.role}
            options={roles.map((role) => ({
              value: role,
              label: role[0]?.toUpperCase() + role.slice(1),
            }))}
            className="h-9"
          />
        </label>
      </div>

      {children}

      <div className="flex justify-end gap-4 border-t border-border/70 pt-2.5">
        <SubmitButton
          label={submitLabel}
          variant="outline"
          size="lg"
          className="h-10 min-w-44 rounded-xl px-5"
        />
      </div>
    </form>
  );
}
