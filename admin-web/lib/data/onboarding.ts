import { cache } from "react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { OnboardingSnapshot } from "@/lib/types/app";

type TenantOnboardingSettingsRow = {
  settings_reviewed_at: string | null;
  onboarding_completed_at: string | null;
};

export const getOnboardingSnapshot = cache(async (tenantId: string): Promise<OnboardingSnapshot> => {
  const supabaseAdmin = createSupabaseAdminClient();

  const [
    { count: customerCount },
    { count: categoryCount },
    { count: itemCount },
    { count: orderCount },
    { data: settings },
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id", { head: true, count: "exact" })
      .eq("tenant_id", tenantId)
      .eq("role", "customer"),
    supabaseAdmin
      .from("menu_categories")
      .select("id", { head: true, count: "exact" })
      .eq("tenant_id", tenantId),
    supabaseAdmin
      .from("menu_items")
      .select("id", { head: true, count: "exact" })
      .eq("tenant_id", tenantId),
    supabaseAdmin
      .from("orders")
      .select("id", { head: true, count: "exact" })
      .eq("tenant_id", tenantId),
    supabaseAdmin
      .from("tenant_settings")
      .select("settings_reviewed_at, onboarding_completed_at")
      .eq("tenant_id", tenantId)
      .maybeSingle<TenantOnboardingSettingsRow>(),
  ]);

  const membersReady = (customerCount ?? 0) > 0;
  const menuReady = (categoryCount ?? 0) > 0 && (itemCount ?? 0) > 0;
  const settingsReady = Boolean(settings?.settings_reviewed_at);
  const testOrderReady = (orderCount ?? 0) > 0;
  const completedSteps = [membersReady, menuReady, settingsReady, testOrderReady].filter(Boolean).length;
  const totalSteps = 4;
  const isComplete = Boolean(settings?.onboarding_completed_at) || completedSteps === totalSteps;

  let nextStep: 2 | 3 | 4 | 5 = 5;
  if (!membersReady) {
    nextStep = 2;
  } else if (!menuReady) {
    nextStep = 3;
  } else if (!settingsReady) {
    nextStep = 4;
  } else if (!testOrderReady) {
    nextStep = 5;
  }

  return {
    customerCount: customerCount ?? 0,
    categoryCount: categoryCount ?? 0,
    itemCount: itemCount ?? 0,
    orderCount: orderCount ?? 0,
    settingsReviewedAt: settings?.settings_reviewed_at ?? null,
    onboardingCompletedAt: settings?.onboarding_completed_at ?? null,
    membersReady,
    menuReady,
    settingsReady,
    testOrderReady,
    completedSteps,
    totalSteps,
    isComplete,
    nextStep,
  };
});
