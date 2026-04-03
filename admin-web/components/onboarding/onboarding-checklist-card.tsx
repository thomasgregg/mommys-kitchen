import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { OnboardingSnapshot } from "@/lib/types/app";

export function OnboardingChecklistCard({ snapshot }: { snapshot: OnboardingSnapshot }) {
  if (snapshot.isComplete) {
    return null;
  }

  return (
    <Card size="sm" className="h-12 border-[#D97745] bg-[#D97745] py-0 text-white shadow-sm">
      <CardContent className="flex h-full items-center justify-between gap-3 py-0">
        <p className="m-0 flex-1 text-sm leading-5 text-white/90 pr-4">
          Finish the quick onboarding checklist so your family can place its first order with confidence.
        </p>
        <div className="flex shrink-0 justify-end">
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
        </div>
      </CardContent>
    </Card>
  );
}
