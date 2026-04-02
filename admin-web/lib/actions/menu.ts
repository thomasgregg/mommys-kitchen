"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setFlashToast } from "@/lib/utils/flash-toast";

export async function upsertMenuItemAction(formData: FormData) {
  throw new Error("Use submitMenuItemAction for menu item forms.");
}

export async function submitMenuItemAction(
  _previousState: { status: "success" | "error"; message: string } | null,
  formData: FormData,
) {
  try {
    await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = createSupabaseAdminClient();
    const id = String(formData.get("id") ?? "").trim();
    const menuItemId = id || crypto.randomUUID();
    const currentImageUrl = String(formData.get("currentImageUrl") ?? "").trim() || null;
    const rawPrice = String(formData.get("price") ?? formData.get("priceCents") ?? "").trim();
    const file = formData.get("image");

    const payload = {
      id: menuItemId,
      category_id: String(formData.get("categoryId") ?? ""),
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      image_url: currentImageUrl,
      price_cents: parsePriceToCents(rawPrice),
      prep_minutes: Number(formData.get("prepMinutes") ?? 0),
      is_available: formData.get("isAvailable") === "on",
      is_featured: formData.get("isFeatured") === "on",
    };

    if (!payload.category_id) {
      return { status: "error" as const, message: "Category is required." };
    }

    if (!payload.name.trim()) {
      return { status: "error" as const, message: "Menu item name is required." };
    }

    if (!Number.isFinite(payload.price_cents) || payload.price_cents < 0) {
      return { status: "error" as const, message: "Enter a valid price." };
    }

    let nextImageUrl = currentImageUrl;
    let uploadedStoragePath: string | null = null;

    if (file instanceof File && file.size > 0) {
      if (file.size > 10 * 1024 * 1024) {
        return { status: "error" as const, message: "Choose an image smaller than 10 MB." };
      }

      if (!/^image\/(png|jpe?g|webp|heic|heif)$/i.test(file.type)) {
        return { status: "error" as const, message: "Choose a PNG, JPG, WebP, or HEIC image." };
      }

      const processedImage = await optimizeMenuImage(file);
      uploadedStoragePath = `menu-items/${menuItemId}/${Date.now()}-menu.jpg`;
      await ensureMenuImagesBucket(supabaseAdmin);

      const { error: uploadError } = await supabaseAdmin.storage.from("menu-images").upload(uploadedStoragePath, processedImage, {
        cacheControl: "3600",
        contentType: "image/jpeg",
        upsert: true,
      });

      if (uploadError) {
        return { status: "error" as const, message: uploadError.message };
      }

      const { data } = supabaseAdmin.storage.from("menu-images").getPublicUrl(uploadedStoragePath);
      nextImageUrl = data.publicUrl;
    }

    const { error } = await supabase.from("menu_items").upsert(payload);
    if (error) {
      if (uploadedStoragePath) {
        await supabaseAdmin.storage.from("menu-images").remove([uploadedStoragePath]);
      }
      return { status: "error" as const, message: error.message };
    }

    if (nextImageUrl !== currentImageUrl) {
      const { error: updateImageError } = await supabase
        .from("menu_items")
        .update({ image_url: nextImageUrl, updated_at: new Date().toISOString() })
        .eq("id", menuItemId);

      if (updateImageError) {
        if (uploadedStoragePath) {
          await supabaseAdmin.storage.from("menu-images").remove([uploadedStoragePath]);
        }
        return { status: "error" as const, message: updateImageError.message };
      }

      const previousStoragePath = parseMenuImageStoragePath(currentImageUrl);
      if (previousStoragePath && previousStoragePath !== uploadedStoragePath) {
        await supabaseAdmin.storage.from("menu-images").remove([previousStoragePath]);
      }
    }

    revalidatePath("/menu");

    return {
      status: "success" as const,
      message: id ? "Menu item saved." : "Menu item created.",
    };
  } catch (error) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Could not save the menu item.",
    };
  }
}

export async function deleteMenuItemAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    await setFlashToast({ type: "error", message: "Missing menu item id." });
    redirect("/menu");
  }

  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = createSupabaseAdminClient();

  const { data: existingItem, error: existingItemError } = await supabase
    .from("menu_items")
    .select("image_url")
    .eq("id", id)
    .single<{ image_url: string | null }>();

  if (existingItemError) {
    await setFlashToast({ type: "error", message: existingItemError.message });
    redirect("/menu");
  }

  const { error } = await supabase.from("menu_items").delete().eq("id", id);

  if (error) {
    await setFlashToast({ type: "error", message: error.message });
    redirect("/menu");
  }

  const storagePath = parseMenuImageStoragePath(existingItem?.image_url ?? null);
  if (storagePath) {
    await supabaseAdmin.storage.from("menu-images").remove([storagePath]);
  }

  await setFlashToast({ type: "success", message: "Menu item deleted." });

  revalidatePath("/menu");
  redirect("/menu");
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

async function optimizeMenuImage(file: File) {
  const bytes = await file.arrayBuffer();

  return await sharp(Buffer.from(bytes))
    .rotate()
    .resize(1600, 1200, {
      fit: "cover",
      position: "attention",
    })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
}

function parseMenuImageStoragePath(imageUrl: string | null) {
  if (!imageUrl) {
    return null;
  }

  const marker = "/storage/v1/object/public/menu-images/";
  const markerIndex = imageUrl.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  return imageUrl.slice(markerIndex + marker.length);
}

async function ensureMenuImagesBucket(supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>) {
  const { data: bucket, error: getBucketError } = await supabaseAdmin.storage.getBucket("menu-images");

  if (!getBucketError && bucket) {
    return;
  }

  const { error: createBucketError } = await supabaseAdmin.storage.createBucket("menu-images", {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"],
  });

  if (createBucketError && !/already exists/i.test(createBucketError.message)) {
    throw new Error(createBucketError.message);
  }
}
