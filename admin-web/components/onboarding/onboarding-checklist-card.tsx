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
    <Card size="sm" className="border-[#D97745] bg-[#D97745] text-white shadow-sm">
      <CardHeader className="text-white">
        <CardTitle className="text-white">Complete your setup</CardTitle>
        <CardDescription className="text-white/90">
          Finish the quick onboarding checklist so your family can place its first order with confidence.
        </CardDescription>
        <CardAction>
          <Button
            render={<Link href={`/onboarding?step=${snapshot.nextStep}`} />}
            nativeButton={false}
            variant="ghost"
            size="sm"
            className="whitespace-nowrap border border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            Resume setup
            <ArrowRight data-icon="inline-end" />
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
