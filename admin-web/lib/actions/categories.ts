"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setFlashToast } from "@/lib/utils/flash-toast";

export async function upsertMenuCategoryAction(formData: FormData) {
  throw new Error("Use submitMenuCategoryAction for category forms.");
}

export async function submitMenuCategoryAction(
  _previousState: { status: "success" | "error"; message: string } | null,
  formData: FormData,
) {
  try {
    const { profile } = await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const id = String(formData.get("id") ?? "").trim();

    const payload = {
      ...(id ? { id } : {}),
      tenant_id: profile.tenant_id,
      name: String(formData.get("name") ?? "").trim(),
      sort_order: Number(formData.get("sortOrder") ?? 0),
      is_active: formData.get("isActive") === "on",
    };

    if (!payload.name) {
      return { status: "error" as const, message: "Category name is required." };
    }

    const { error } = await supabase.from("menu_categories").upsert(payload);

    if (error) {
      return { status: "error" as const, message: error.message };
    }

    revalidatePath("/categories");
    revalidatePath("/menu");

    return {
      status: "success" as const,
      message: id ? "Category saved." : "Category created.",
    };
  } catch (error) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Could not save the category.",
    };
  }
}

export async function toggleMenuCategoryAction(formData: FormData) {
  const { profile } = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const id = String(formData.get("id") ?? "").trim();
  const isActive = formData.get("isActive") === "true";

  if (!id) {
    throw new Error("Missing category id.");
  }

  const { error } = await supabase
    .from("menu_categories")
    .update({
      is_active: !isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("tenant_id", profile.tenant_id);

  if (error) {
    throw new Error(error.message);
  }

  await setFlashToast({
    type: "success",
    message: isActive ? "Category hidden from the customer app." : "Category is visible in the customer app again.",
  });

  revalidatePath("/categories");
  revalidatePath("/menu");
}

export async function deleteMenuCategoryAction(formData: FormData) {
  const { profile } = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    await setFlashToast({ type: "error", message: "Missing category id." });
    redirect("/categories");
  }

  const { count, error: countError } = await supabase
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id)
    .eq("tenant_id", profile.tenant_id);

  if (countError) {
    await setFlashToast({ type: "error", message: countError.message });
    redirect("/categories");
  }

  if ((count ?? 0) > 0) {
    await setFlashToast({ type: "error", message: "Move or remove menu items before deleting this category." });
    redirect("/categories");
  }

  const { error } = await supabase
    .from("menu_categories")
    .delete()
    .eq("id", id)
    .eq("tenant_id", profile.tenant_id);

  if (error) {
    await setFlashToast({ type: "error", message: error.message });
    redirect("/categories");
  }

  await setFlashToast({ type: "success", message: "Category deleted." });

  revalidatePath("/categories");
  revalidatePath("/menu");
  redirect("/categories");
}
