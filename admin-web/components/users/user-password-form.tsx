"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateUserPasswordAction } from "@/lib/actions/users";
import type { Profile } from "@/lib/types/app";

export function UserPasswordForm({
  profile,
  disabled = false,
  onSuccess,
  embedded = false,
}: {
  profile: Profile;
  disabled?: boolean;
  onSuccess?: () => void;
  embedded?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ status: "success" | "error"; message: string } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, startTransition] = useTransition();

  function resetPasswordFields() {
    setPassword("");
    setConfirmPassword("");
  }

  function handleCancel() {
    setFeedback(null);
    resetPasswordFields();
    setIsOpen(false);
  }

  function handleSubmit() {
    const formData = new FormData();
    formData.set("id", profile.id);
    formData.set("password", password);
    formData.set("confirmPassword", confirmPassword);

    startTransition(async () => {
      const state = await updateUserPasswordAction(null, formData);

      if (state.status === "success") {
        toast.success(state.message);
        setFeedback(null);
        resetPasswordFields();
        setIsOpen(false);
        onSuccess?.();
        return;
      }

      toast.error(state.message);
      setFeedback(state);
    });
  }

  return (
    <div className={embedded ? "border-t border-border/70 pt-3" : ""}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Password</p>
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
            className="justify-start self-start sm:self-auto"
            onClick={() => {
              setFeedback(null);
              resetPasswordFields();
              setIsOpen(true);
            }}
            disabled={disabled}
          >
            Change password
          </Button>
        ) : null}
      </div>

      {isOpen && !disabled ? (
        <div className="mt-3 flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2 sm:items-start">
            <label className="grid gap-2.5">
              <span className="text-sm font-medium text-foreground">New password</span>
              <Input
                type="password"
                minLength={8}
                placeholder="At least 8 characters"
                className="h-9 rounded-xl bg-background"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <label className="grid gap-2.5">
              <span className="text-sm font-medium text-foreground">Confirm password</span>
              <Input
                type="password"
                minLength={8}
                placeholder="Repeat the new password"
                className="h-9 rounded-xl bg-background"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start text-muted-foreground hover:text-foreground"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              className="justify-start"
              onClick={handleSubmit}
            >
              {pending ? "Working..." : "Update password"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
