import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Profile, TenantSummary } from "@/lib/types/app";

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = createSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, tenant_id, full_name, phone, role")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile || !profile.tenant_id) {
    redirect("/login?error=Unable%20to%20load%20your%20admin%20profile");
  }

  if (profile.role !== "admin") {
    await supabase.auth.signOut();
    redirect("/login?error=Admin%20access%20required");
  }

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("id, slug, name, status")
    .eq("id", profile.tenant_id)
    .maybeSingle<TenantSummary>();

  if (!tenant) {
    redirect("/login?error=Unable%20to%20load%20your%20family");
  }

  return { supabase, user, profile, tenant };
}
