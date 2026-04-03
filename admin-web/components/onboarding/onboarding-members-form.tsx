"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addFamilyMemberOnboardingAction } from "@/lib/actions/onboarding";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

export function OnboardingMembersForm() {
  const [state, formAction] = useActionState(addFamilyMemberOnboardingAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const handledStateRef = useRef<string | null>(null);
  const router = useRouter();

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
      formRef.current?.reset();
      router.refresh();
    } else {
      toast.error(state.message);
    }
  }, [router, state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 sm:items-start">
        <label className="grid gap-2.5">
          <span className="text-sm font-medium text-foreground">Full name</span>
          <Input name="fullName" required placeholder="Mia" className="h-9 rounded-xl bg-background" />
        </label>

        <label className="grid gap-2.5">
          <span className="text-sm font-medium text-foreground">Phone</span>
          <Input name="phone" placeholder="+49 ..." className="h-9 rounded-xl bg-background" />
        </label>

        <label className="grid gap-2.5 sm:col-span-2">
          <span className="text-sm font-medium text-foreground">Email</span>
          <Input name="email" type="email" required placeholder="child@example.com" className="h-9 rounded-xl bg-background" />
        </label>

        <label className="grid gap-2.5 sm:col-span-2">
          <span className="text-sm font-medium text-foreground">Temporary password</span>
          <Input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="h-9 rounded-xl bg-background"
          />
        </label>
      </div>

      <div className="flex justify-end border-t border-border/70 pt-2.5">
        <SubmitButton label="Add family member" variant="outline" size="lg" className="h-10 min-w-44 rounded-xl px-5" />
      </div>
    </form>
  );
}
