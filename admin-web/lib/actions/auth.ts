"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient, hasSupabaseAdminAccess } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types/app";

function slugifyTenantName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSignupErrorMessage(message: unknown) {
  const text = typeof message === "string" ? message.trim() : "";

  if (!text || text === "{}" || text === "[object Object]") {
    return "Setup failed. Please try again.";
  }

  const lower = text.toLowerCase();

  if (lower.includes("already registered") || lower.includes("already exists") || lower.includes("duplicate")) {
    if (lower.includes("tenant slug")) {
      return "A family with this name already exists. Choose a different family name.";
    }

    return "An account with this email already exists. Sign in instead.";
  }

  if (
    lower.includes("unexpected failure") ||
    lower.includes("database error") ||
    lower.includes("request timed out") ||
    lower.includes("request_timeout") ||
    lower.includes("context deadline exceeded")
  ) {
    return "Local signup is temporarily unavailable. Please try again once. If it keeps happening, restart the local Supabase stack.";
  }

  return text;
}

function normalizeLoginErrorMessage(message: unknown) {
  const text = typeof message === "string" ? message.trim() : "";

  if (!text || text === "{}" || text === "[object Object]") {
    return "Sign-in failed. Please try again.";
  }

  const lower = text.toLowerCase();

  if (
    lower.includes("database error") ||
    lower.includes("request timed out") ||
    lower.includes("request_timeout") ||
    lower.includes("context deadline exceeded")
  ) {
    return "Local sign-in is temporarily unavailable. Please try again once. If it keeps happening, restart the local Supabase stack.";
  }

  return text;
}

async function emailAlreadyExists(email: string) {
  if (!hasSupabaseAdminAccess()) {
    return false;
  }

  const supabaseAdmin = createSupabaseAdminClient();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });

    if (error) {
      return false;
    }

    const users = data.users ?? [];
    if (users.some((user) => user.email?.toLowerCase() === email.toLowerCase())) {
      return true;
    }

    if (users.length < perPage) {
      return false;
    }

    page += 1;
  }
}

async function tenantSlugAlreadyExists(tenantSlug: string) {
  if (!hasSupabaseAdminAccess()) {
    return false;
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("slug", tenantSlug)
    .limit(1)
    .maybeSingle();

  if (error) {
    return false;
  }

  return Boolean(data);
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = createSupabaseAdminClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(normalizeLoginErrorMessage(error.message))}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, tenant_id, full_name, phone, role")
    .eq("id", user!.id)
    .maybeSingle<Profile>();

  if (!profile || !profile.tenant_id) {
    redirect("/login?error=Unable%20to%20load%20your%20admin%20profile");
  }

  if (profile.role !== "admin") {
    await supabase.auth.signOut();
    redirect("/login?error=Admin%20access%20required");
  }

  redirect("/");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function signUpTenantAction(formData: FormData) {
  const tenantName = String(formData.get("tenantName") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!tenantName || !fullName || !email || !password) {
    redirect("/signup?error=Please%20fill%20in%20all%20required%20fields");
  }

  const tenantSlug = slugifyTenantName(tenantName);
  if (!tenantSlug) {
    redirect("/signup?error=Family%20name%20must%20contain%20letters%20or%20numbers");
  }

  if (await tenantSlugAlreadyExists(tenantSlug)) {
    redirect(`/signup?error=${encodeURIComponent("A family with this name already exists. Choose a different family name.")}`);
  }

  if (await emailAlreadyExists(email)) {
    redirect(`/signup?error=${encodeURIComponent("An account with this email already exists. Sign in instead.")}`);
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone || null,
        tenant_name: tenantName,
        tenant_slug: tenantSlug,
        create_tenant: true,
      },
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(normalizeSignupErrorMessage(error.message))}`);
  }

  if (data.session) {
    redirect("/onboarding?step=1");
  }

  redirect(`/login?message=${encodeURIComponent("Family created. Check your email, then sign in.")}`);
}
