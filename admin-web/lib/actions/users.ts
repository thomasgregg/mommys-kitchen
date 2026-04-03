"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProfileRole } from "@/lib/types/app";
import { setFlashToast } from "@/lib/utils/flash-toast";

const allowedRoles = new Set<ProfileRole>(["customer", "admin"]);

export async function createUserAction(
  _previousState: { status: "success" | "error"; message: string } | null,
  formData: FormData,
) {
  try {
    await requireAdmin();

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "").trim();
    const fullName = String(formData.get("fullName") ?? "").trim() || null;
    const phone = String(formData.get("phone") ?? "").trim() || null;
    const role = String(formData.get("role") ?? "customer").trim() as ProfileRole;

    if (!email) {
      return { status: "error" as const, message: "Email is required." };
    }

    if (!password) {
      return { status: "error" as const, message: "Temporary password is required." };
    }

    if (password.length < 8) {
      return { status: "error" as const, message: "Temporary password must be at least 8 characters." };
    }

    if (!allowedRoles.has(role)) {
      return { status: "error" as const, message: "Invalid role." };
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
      },
    });

    if (createError || !data.user) {
      return { status: "error" as const, message: createError?.message ?? "Could not create user." };
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: data.user.id,
          full_name: fullName,
          phone,
          role,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

    if (profileError) {
      return { status: "error" as const, message: profileError.message };
    }

    revalidatePath("/users");

    return { status: "success" as const, message: "User created." };
  } catch (error) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Could not create user.",
    };
  }
}

export async function updateUserProfileAction(
  _previousState: { status: "success" | "error"; message: string } | null,
  formData: FormData,
) {
  try {
    await requireAdmin();

    const id = String(formData.get("id") ?? "").trim();
    const fullName = String(formData.get("fullName") ?? "").trim() || null;
    const phone = String(formData.get("phone") ?? "").trim() || null;
    const role = String(formData.get("role") ?? "customer").trim() as ProfileRole;

    if (!id) {
      return { status: "error" as const, message: "Missing user id." };
    }

    if (!allowedRoles.has(role)) {
      return { status: "error" as const, message: "Invalid role." };
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
      return { status: "error" as const, message: error.message };
    }

    revalidatePath("/users");
    revalidatePath(`/users/${id}`);
    revalidatePath("/orders");

    return { status: "success" as const, message: "Profile saved." };
  } catch (error) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Could not save profile.",
    };
  }
}

export async function updateUserPasswordAction(
  _previousState: { status: "success" | "error"; message: string } | null,
  formData: FormData,
) {
  try {
    await requireAdmin();

    const id = String(formData.get("id") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!id) {
      return { status: "error" as const, message: "Missing user id." };
    }

    if (!password) {
      return { status: "error" as const, message: "New password is required." };
    }

    if (password.length < 8) {
      return { status: "error" as const, message: "New password must be at least 8 characters." };
    }

    if (password !== confirmPassword) {
      return { status: "error" as const, message: "Passwords do not match." };
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password,
    });

    if (error) {
      return { status: "error" as const, message: error.message };
    }

    revalidatePath("/users");
    revalidatePath(`/users/${id}`);

    return { status: "success" as const, message: "Password updated." };
  } catch (error) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Could not update password.",
    };
  }
}

export async function deleteUserAction(formData: FormData) {
  const { user } = await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    throw new Error("Missing user id.");
  }

  if (id === user.id) {
    await setFlashToast({
      type: "error",
      message: "You can't delete the account you're currently signed in with.",
    });
    redirect(`/users/${id}`);
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const { error: deviceTokenError } = await supabaseAdmin
    .from("device_tokens")
    .delete()
    .eq("user_id", id);

  if (deviceTokenError) {
    throw new Error(deviceTokenError.message);
  }

  const { error: notificationError } = await supabaseAdmin
    .from("notifications")
    .delete()
    .eq("user_id", id);

  if (notificationError) {
    throw new Error(notificationError.message);
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name: "Deleted account",
      phone: null,
      role: "customer",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(id, true);

  if (deleteUserError) {
    throw new Error(deleteUserError.message);
  }

  await setFlashToast({
    type: "success",
    message: "User deleted. Order history stayed anonymized.",
  });

  revalidatePath("/users");
  revalidatePath(`/users/${id}`);
  revalidatePath("/orders");

  redirect("/users");
}
