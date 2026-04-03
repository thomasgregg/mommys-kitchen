import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, Sparkles, Users, UtensilsCrossed, Settings2, ReceiptText } from "lucide-react";
import { OnboardingMembersForm } from "@/components/onboarding/onboarding-members-form";
import { OnboardingSettingsForm } from "@/components/onboarding/onboarding-settings-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOnboardingSnapshot } from "@/lib/data/onboarding";
import { getAppSettings } from "@/lib/data/app-settings";
import { requireAdmin } from "@/lib/auth/require-admin";
import { completeOnboardingAction, seedSampleMenuAction } from "@/lib/actions/onboarding";
import type { Profile } from "@/lib/types/app";

const stepMeta = [
  { value: 1, label: "Family", icon: Sparkles },
  { value: 2, label: "Members", icon: Users },
  { value: 3, label: "Menu", icon: UtensilsCrossed },
  { value: 4, label: "Settings", icon: Settings2 },
  { value: 5, label: "Test order", icon: ReceiptText },
] as const;

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const params = await searchParams;
  const { profile, tenant, supabase } = await requireAdmin();
  const [snapshot, settings] = await Promise.all([
    getOnboardingSnapshot(profile.tenant_id),
    getAppSettings(profile.tenant_id),
  ]);

  const stepParam = Number(params.step);
  const hasExplicitStep = Boolean(params.step);
  const step = normalizeStep(hasExplicitStep ? stepParam : snapshot.nextStep);

  if (snapshot.isComplete && step !== 1) {
    redirect("/");
  }

  const { data: familyMembers } = await supabase
    .from("profiles")
    .select("id, tenant_id, full_name, phone, role")
    .eq("tenant_id", profile.tenant_id)
    .eq("role", "customer")
    .order("full_name", { ascending: true })
    .returns<Profile[]>();

  return (
    <div className="space-y-5">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Family setup</h1>
        <p className="text-sm text-muted-foreground">
          Get this family ready for its first real order with a short guided setup.
        </p>
      </section>

      <Card size="sm" className="border-border/70 bg-card shadow-sm">
        <CardHeader className="border-b border-border/70">
          <CardTitle>
            {tenant.name}
          </CardTitle>
          <CardDescription>
            Step {step} of 5. You can stop anytime and continue later from the dashboard checklist.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${((step - 1) / 4) * 100}%` }} />
          </div>
          <div className="grid gap-2 md:grid-cols-5">
            {stepMeta.map((entry) => {
              const complete =
                entry.value === 1 ||
                (entry.value === 2 && snapshot.membersReady) ||
                (entry.value === 3 && snapshot.menuReady) ||
                (entry.value === 4 && snapshot.settingsReady) ||
                (entry.value === 5 && snapshot.testOrderReady);
              const active = entry.value === step;
              const Icon = entry.icon;

              return (
                <div
                  key={entry.value}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                    active
                      ? "border-primary/20 bg-primary/5"
                      : complete
                        ? "border-emerald-200 bg-emerald-50/50"
                        : "border-border/70 bg-background"
                  }`}
                >
                  <Icon className={`size-4 ${complete ? "text-emerald-600" : active ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm font-medium text-foreground">{entry.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {step === 1 ? (
        <Card className="border-border/70 bg-card shadow-sm">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Welcome to Mommy's Kitchen</CardTitle>
            <CardDescription>
              Your family workspace is ready. Let’s make it usable in just a few quick steps.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-3 md:grid-cols-2">
              <ChecklistItem label="Add family members who can order from the customer app." />
              <ChecklistItem label="Load a starter menu or begin with a blank setup." />
              <ChecklistItem label="Confirm localization settings once for the whole family." />
              <ChecklistItem label="Place one test order to verify the full flow." />
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-border/70 pt-4">
              <Button render={<Link href="/" />} nativeButton={false} variant="ghost" size="sm">
                Skip for now
              </Button>
              <Button render={<Link href="/onboarding?step=2" />} nativeButton={false} variant="outline" size="lg">
                Start setup
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="border-border/70 bg-card shadow-sm">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Add family members</CardTitle>
            <CardDescription>
              Create customer accounts so someone can sign into the customer app and place the first test order.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">{snapshot.customerCount} family member{snapshot.customerCount === 1 ? "" : "s"} added</p>
                  <p className="text-sm text-muted-foreground">You can add more later in Users & Roles.</p>
                </div>
                {snapshot.membersReady ? <Badge variant="outline" className="rounded-full">Ready</Badge> : null}
              </div>
              {familyMembers?.length ? (
                <div className="grid gap-2">
                  {familyMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{member.full_name || "Unnamed member"}</p>
                        <p className="text-sm text-muted-foreground">{member.phone || "No phone on file"}</p>
                      </div>
                      <Badge variant="outline" className="rounded-full">Customer</Badge>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <Card size="sm" className="border-border/70 bg-muted/10 shadow-none">
              <CardHeader>
                <CardTitle>Add a family member</CardTitle>
                <CardDescription>Create one customer account now and add the rest later if you want.</CardDescription>
              </CardHeader>
              <CardContent>
                <OnboardingMembersForm />
              </CardContent>
            </Card>

            <div className="flex flex-wrap justify-between gap-2 border-t border-border/70 pt-4">
              <Button render={<Link href="/onboarding?step=1" />} nativeButton={false} variant="ghost" size="sm">
                Back
              </Button>
              <div className="flex gap-2">
                <Button render={<Link href="/onboarding?step=3" />} nativeButton={false} variant="ghost" size="sm">
                  Continue later
                </Button>
                {snapshot.membersReady ? (
                  <Button render={<Link href="/onboarding?step=3" />} nativeButton={false} variant="outline" size="lg">
                    Continue
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className="border-border/70 bg-card shadow-sm">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Set up your menu</CardTitle>
            <CardDescription>
              Start with a ready-made menu or keep everything blank and build it yourself.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <form action={seedSampleMenuAction} className="rounded-xl border border-border/70 bg-background p-4">
                <input type="hidden" name="mode" value="sample" />
                <div className="space-y-2">
                  <h3 className="font-medium text-foreground">Load starter menu</h3>
                  <p className="text-sm text-muted-foreground">
                    Add sample categories and dishes you can edit, delete, or replace anytime.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="outline" className="rounded-full">Favorites</Badge>
                    <Badge variant="outline" className="rounded-full">Comfort Classics</Badge>
                    <Badge variant="outline" className="rounded-full">Soups & Sides</Badge>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button type="submit" variant="outline" size="lg">
                    Load starter menu
                  </Button>
                </div>
              </form>

              <form action={seedSampleMenuAction} className="rounded-xl border border-border/70 bg-background p-4">
                <input type="hidden" name="mode" value="empty" />
                <div className="space-y-2">
                  <h3 className="font-medium text-foreground">Start empty</h3>
                  <p className="text-sm text-muted-foreground">
                    Begin with a blank menu and build categories and items yourself.
                  </p>
                  <p className="pt-2 text-sm text-muted-foreground">
                    Good if you already know exactly what you want to offer.
                  </p>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button type="submit" variant="ghost" size="sm">
                    Start empty
                  </Button>
                </div>
              </form>
            </div>

            {snapshot.menuReady ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800">
                Your family menu already has {snapshot.categoryCount} categor{snapshot.categoryCount === 1 ? "y" : "ies"} and {snapshot.itemCount} item{snapshot.itemCount === 1 ? "" : "s"}.
              </div>
            ) : null}

            <div className="flex flex-wrap justify-between gap-2 border-t border-border/70 pt-4">
              <Button render={<Link href="/onboarding?step=2" />} nativeButton={false} variant="ghost" size="sm">
                Back
              </Button>
              {snapshot.menuReady ? (
                <Button render={<Link href="/onboarding?step=4" />} nativeButton={false} variant="outline" size="lg">
                  Continue
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card className="border-border/70 bg-card shadow-sm">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Check your settings</CardTitle>
            <CardDescription>
              Confirm how prices and text should appear across the admin and customer apps.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <OnboardingSettingsForm settings={settings} />
            <div className="flex justify-start">
              <Button render={<Link href="/onboarding?step=3" />} nativeButton={false} variant="ghost" size="sm">
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 5 ? (
        <Card className="border-border/70 bg-card shadow-sm">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Place your first test order</CardTitle>
            <CardDescription>
              Use the customer app with one of the family members you created, then watch the order appear here for the kitchen/admin side.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-3 md:grid-cols-2">
              <ChecklistItem label="Sign in to the customer app with a family member account." />
              <ChecklistItem label="Place one small sample order from the live menu." />
              <ChecklistItem label="Open Current Orders or Kitchen Admin and accept the order." />
              <ChecklistItem label="Mark the order ready or complete to confirm the full flow." />
            </div>

            <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
              <p className="font-medium text-foreground">
                {snapshot.testOrderReady
                  ? `Great — ${snapshot.orderCount} order${snapshot.orderCount === 1 ? "" : "s"} already exist for this family.`
                  : "No test order yet. You can still continue later from the dashboard checklist."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                The onboarding checklist will stay visible until the first test order is complete.
              </p>
            </div>

            <div className="flex flex-wrap justify-between gap-2 border-t border-border/70 pt-4">
              <Button render={<Link href="/onboarding?step=4" />} nativeButton={false} variant="ghost" size="sm">
                Back
              </Button>
              <div className="flex gap-2">
                <Button render={<Link href="/" />} nativeButton={false} variant="ghost" size="sm">
                  Finish later
                </Button>
                <form action={completeOnboardingAction}>
                  <Button type="submit" variant="outline" size="lg">
                    {snapshot.testOrderReady ? "Complete setup" : "Go to dashboard"}
                  </Button>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function normalizeStep(value: number) {
  if ([1, 2, 3, 4, 5].includes(value)) {
    return value as 1 | 2 | 3 | 4 | 5;
  }

  return 2;
}

function ChecklistItem({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-background px-4 py-3">
      <CheckCircle2 className="mt-0.5 size-4 text-primary" />
      <span className="text-sm text-foreground">{label}</span>
    </div>
  );
}
