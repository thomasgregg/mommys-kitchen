"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setFlashToast } from "@/lib/utils/flash-toast";

export async function upsertMenuCategoryAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const id = String(formData.get("id") ?? "").trim();

  const payload = {
    ...(id ? { id } : {}),
    name: String(formData.get("name") ?? "").trim(),
    sort_order: Number(formData.get("sortOrder") ?? 0),
    is_active: formData.get("isActive") === "on",
  };

  if (!payload.name) {
    throw new Error("Category name is required.");
  }

  const { error } = await supabase.from("menu_categories").upsert(payload);

  if (error) {
    throw new Error(error.message);
  }

  await setFlashToast({
    type: "success",
    message: id ? "Category saved." : "Category created.",
  });

  revalidatePath("/categories");
  revalidatePath("/menu");
}

export async function toggleMenuCategoryAction(formData: FormData) {
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
    .eq("id", id);

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
  const supabase = await createSupabaseServerClient();
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    throw new Error("Missing category id.");
  }

  const { count, error: countError } = await supabase
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (countError) {
    throw new Error(countError.message);
  }

  if ((count ?? 0) > 0) {
    throw new Error("Move or remove menu items before deleting this category.");
  }

  const { error } = await supabase.from("menu_categories").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await setFlashToast({ type: "success", message: "Category deleted." });

  revalidatePath("/categories");
  revalidatePath("/menu");
}
