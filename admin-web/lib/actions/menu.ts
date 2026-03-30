"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setFlashToast } from "@/lib/utils/flash-toast";

export async function upsertMenuItemAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const id = String(formData.get("id") ?? "").trim();
  const rawPrice = String(formData.get("price") ?? formData.get("priceCents") ?? "").trim();

  const payload = {
    ...(id ? { id } : {}),
    category_id: String(formData.get("categoryId") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    image_url: String(formData.get("imageUrl") ?? "").trim() || null,
    price_cents: parsePriceToCents(rawPrice),
    prep_minutes: Number(formData.get("prepMinutes") ?? 0),
    is_available: formData.get("isAvailable") === "on",
    is_featured: formData.get("isFeatured") === "on",
  };

  if (!payload.category_id) {
    throw new Error("Category is required.");
  }

  if (!payload.name.trim()) {
    throw new Error("Menu item name is required.");
  }

  if (!Number.isFinite(payload.price_cents) || payload.price_cents < 0) {
    throw new Error("Enter a valid price.");
  }

  const { error } = await supabase.from("menu_items").upsert(payload);
  if (error) {
    throw new Error(error.message);
  }

  await setFlashToast({
    type: "success",
    message: id ? "Menu item saved." : "Menu item created.",
  });

  revalidatePath("/menu");
}

export async function uploadMenuImageAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const file = formData.get("image");

  if (!id) {
    throw new Error("Missing menu item id.");
  }

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose an image before uploading.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
  const storagePath = `menu-items/${id}/${Date.now()}.${safeExtension}`;
  const supabaseAdmin = createSupabaseAdminClient();

  const { error: uploadError } = await supabaseAdmin.storage
    .from("menu-images")
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabaseAdmin.storage.from("menu-images").getPublicUrl(storagePath);
  const imageUrl = data.publicUrl;

  const { error: updateError } = await supabaseAdmin
    .from("menu_items")
    .update({
      image_url: imageUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await setFlashToast({ type: "success", message: "Photo uploaded." });

  revalidatePath("/menu");
}

export async function toggleMenuAvailabilityAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const id = String(formData.get("id") ?? "");
  const isAvailable = formData.get("isAvailable") === "true";

  const { error } = await supabase
    .from("menu_items")
    .update({ is_available: !isAvailable })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await setFlashToast({
    type: "success",
    message: isAvailable ? "Menu item marked sold out." : "Menu item marked available.",
  });

  revalidatePath("/menu");
}

function parsePriceToCents(input: string) {
  const normalized = input
    .replace(/[^\d,.\-]/g, "")
    .replace(/\s+/g, "");

  if (!normalized) {
    return 0;
  }

  const decimalSeparator = normalized.lastIndexOf(",") > normalized.lastIndexOf(".") ? "," : ".";
  const standardized = normalized
    .replace(decimalSeparator === "," ? /\./g : /,/g, "")
    .replace(decimalSeparator, ".");

  const parsed = Number(standardized);

  if (!Number.isFinite(parsed)) {
    return Number.NaN;
  }

  return Math.round(parsed * 100);
}
