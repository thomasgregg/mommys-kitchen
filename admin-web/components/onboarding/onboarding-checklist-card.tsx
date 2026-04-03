import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OnboardingSnapshot } from "@/lib/types/app";

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
    </Card>
  );
}
