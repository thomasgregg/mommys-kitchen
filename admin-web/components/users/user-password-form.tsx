"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateUserPasswordAction } from "@/lib/actions/users";
import type { Profile } from "@/lib/types/app";

export function UserPasswordForm({
  profile,
  disabled = false,
}: {
  profile: Profile;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ status: "success" | "error"; message: string } | null>(null);
  const [state, formAction, pending] = useActionState(updateUserPasswordAction, null);

  useEffect(() => {
    if (!state) {
      return;
    }

    if (state.status === "success") {
      toast.success(state.message);
      setFeedback(state);
      setIsOpen(false);
    } else if (state.status === "error") {
      toast.error(state.message);
      setFeedback(state);
    }
  }, [state]);

  return (
    <div className="space-y-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          {disabled ? <p className="text-sm text-muted-foreground">Local admin key required.</p> : null}
          {!disabled && feedback?.status === "error" ? (
            <p
              className="text-sm text-destructive"
              aria-live="polite"
            >
              {feedback.message}
            </p>
          ) : null}
        </div>
        {!isOpen ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => {
              setFeedback(null);
              setIsOpen(true);
            }}
            disabled={disabled}
          >
            Change password
          </Button>
        ) : null}
      </div>

      {isOpen && !disabled ? (
        <form action={formAction} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="id" value={profile.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-4">
              <span className="text-sm font-medium text-foreground">New password</span>
              <Input name="password" type="password" minLength={8} placeholder="At least 8 characters" className="h-9 rounded-xl bg-background" />
            </label>

            <label className="grid gap-4">
              <span className="text-sm font-medium text-foreground">Confirm password</span>
              <Input name="confirmPassword" type="password" minLength={8} placeholder="Repeat the new password" className="h-9 rounded-xl bg-background" />
            </label>
          </div>

          <div className="flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start text-muted-foreground hover:text-foreground"
              onClick={() => {
                setFeedback(null);
                setIsOpen(false);
              }}
            >
              Cancel
            </Button>
            <SubmitButton
              label="Update password"
              variant="ghost"
              size="sm"
              disabled={pending}
              className="justify-start"
            />
          </div>
        </form>
      ) : null}
    </div>
  );
}
