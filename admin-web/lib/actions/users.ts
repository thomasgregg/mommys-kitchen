"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProfileRole } from "@/lib/types/app";
import { setFlashToast } from "@/lib/utils/flash-toast";

const allowedRoles = new Set<ProfileRole>(["customer", "admin"]);

export async function updateUserProfileAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "customer").trim() as ProfileRole;

  if (!id) {
    throw new Error("Missing user id.");
  }

  if (!allowedRoles.has(role)) {
    throw new Error("Invalid role.");
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name: fullName,
      phone,
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await setFlashToast({ type: "success", message: "Profile saved." });

  revalidatePath("/users");
  revalidatePath(`/users/${id}`);
  revalidatePath("/orders");
}
