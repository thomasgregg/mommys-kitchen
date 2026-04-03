import Link from "next/link";
import { CheckCircle2, CircleDashed, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OnboardingSnapshot } from "@/lib/types/app";
import { cn } from "@/lib/utils";

const steps = [
  { key: "membersReady", label: "Add family members" },
  { key: "menuReady", label: "Load or create a menu" },
  { key: "settingsReady", label: "Check family settings" },
  { key: "testOrderReady", label: "Place a test order" },
] as const;

export function OnboardingChecklistCard({ snapshot }: { snapshot: OnboardingSnapshot }) {
  if (snapshot.isComplete) {
    return null;
  }

  return (
    <Card size="sm" className="border-border/70 bg-card shadow-sm">
      <CardHeader className="border-b border-border/70">
        <CardTitle>Complete your setup</CardTitle>
        <CardDescription>
          Finish the quick onboarding checklist so your family can place its first order with confidence.
        </CardDescription>
        <CardAction>
          <Button render={<Link href={`/onboarding?step=${snapshot.nextStep}`} />} nativeButton={false} variant="ghost" size="sm">
            Resume setup
            <ArrowRight data-icon="inline-end" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${(snapshot.completedSteps / snapshot.totalSteps) * 100}%` }}
          />
        </div>
        <div className="space-y-2">
          {steps.map((step) => {
            const complete = snapshot[step.key];

            return (
              <div
                key={step.key}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3",
                  complete ? "border-emerald-200 bg-emerald-50/60" : "border-border/70 bg-background",
                )}
              >
                {complete ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : (
                  <CircleDashed className="size-4 text-muted-foreground" />
                )}
                <span className={cn("text-sm", complete ? "text-emerald-800" : "text-foreground")}>{step.label}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
