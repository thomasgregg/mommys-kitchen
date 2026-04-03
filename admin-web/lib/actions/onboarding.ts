"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { currencyOptionFor, languageOptionFor, localeIdentifierForLanguage } from "@/lib/constants/app-settings";
import { setFlashToast } from "@/lib/utils/flash-toast";

type ActionState = { status: "success" | "error"; message: string } | null;

const sampleCategories = [
  { name: "Favorites", sort_order: 0 },
  { name: "Comfort Classics", sort_order: 1 },
  { name: "Soups & Sides", sort_order: 2 },
  { name: "Drinks", sort_order: 3 },
  { name: "Desserts", sort_order: 4 },
] as const;

const sampleItems = [
  {
    category: "Favorites",
    name: "Chicken Nuggets",
    description: "Crispy all-white-meat nuggets served hot and ready for hungry kids.",
    price_cents: 799,
    prep_minutes: 12,
    is_featured: false,
  },
  {
    category: "Favorites",
    name: "Grilled Cheese",
    description: "Butter-toasted sourdough with melted cheddar and mozzarella.",
    price_cents: 699,
    prep_minutes: 10,
    is_featured: false,
  },
  {
    category: "Comfort Classics",
    name: "Mac & Cheese",
    description: "Creamy elbow macaroni folded into a rich cheddar sauce.",
    price_cents: 899,
    prep_minutes: 15,
    is_featured: true,
  },
  {
    category: "Comfort Classics",
    name: "Spaghetti & Meatballs",
    description: "Tender meatballs with spaghetti and a slow-simmered tomato sauce.",
    price_cents: 1399,
    prep_minutes: 22,
    is_featured: true,
  },
  {
    category: "Soups & Sides",
    name: "Tomato Soup",
    description: "Velvety tomato soup finished with basil and a touch of cream.",
    price_cents: 599,
    prep_minutes: 8,
    is_featured: false,
  },
  {
    category: "Soups & Sides",
    name: "Side Salad",
    description: "Fresh greens with cucumber, tomato, and a simple vinaigrette.",
    price_cents: 499,
    prep_minutes: 6,
    is_featured: false,
  },
  {
    category: "Drinks",
    name: "Apple Juice",
    description: "Chilled apple juice served in a small family-size glass.",
    price_cents: 299,
    prep_minutes: 1,
    is_featured: false,
  },
  {
    category: "Desserts",
    name: "Chocolate Pudding",
    description: "Smooth chocolate pudding with a little whipped cream on top.",
    price_cents: 399,
    prep_minutes: 3,
    is_featured: false,
  },
] as const;

export async function addFamilyMemberOnboardingAction(_previousState: ActionState, formData: FormData) {
  try {
    const { profile: currentProfile } = await requireAdmin();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "").trim();
    const fullName = String(formData.get("fullName") ?? "").trim() || null;
    const phone = String(formData.get("phone") ?? "").trim() || null;

    if (!email) {
      return { status: "error" as const, message: "Email is required." };
    }

    if (!password) {
      return { status: "error" as const, message: "Temporary password is required." };
    }

    if (password.length < 8) {
      return { status: "error" as const, message: "Temporary password must be at least 8 characters." };
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
      return { status: "error" as const, message: createError?.message ?? "Could not create family member." };
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: data.user.id,
          tenant_id: currentProfile.tenant_id,
          full_name: fullName,
          phone,
          role: "customer",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

    if (profileError) {
      return { status: "error" as const, message: profileError.message };
    }

    revalidatePath("/onboarding");
    revalidatePath("/users");

    return { status: "success" as const, message: "Family member added." };
  } catch (error) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Could not add family member.",
    };
  }
}

export async function seedSampleMenuAction(formData: FormData) {
  const { profile } = await requireAdmin();
  const mode = String(formData.get("mode") ?? "sample").trim();

  if (mode === "empty") {
    await setFlashToast({
      type: "success",
      message: "Starting with an empty menu. You can add categories and items anytime.",
    });

    redirect("/onboarding?step=4");
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const { error: categoriesError } = await supabaseAdmin
    .from("menu_categories")
    .upsert(
      sampleCategories.map((category) => ({
        tenant_id: profile.tenant_id,
        name: category.name,
        sort_order: category.sort_order,
        is_active: true,
      })),
      { onConflict: "tenant_id,name" },
    );

  if (categoriesError) {
    throw new Error(categoriesError.message);
  }

  const { data: categories, error: selectCategoriesError } = await supabaseAdmin
    .from("menu_categories")
    .select("id, name")
    .eq("tenant_id", profile.tenant_id)
    .returns<Array<{ id: string; name: string }>>();

  if (selectCategoriesError) {
    throw new Error(selectCategoriesError.message);
  }

  const categoryIdByName = new Map((categories ?? []).map((category) => [category.name, category.id]));

  const itemRows = sampleItems
    .map((item) => ({
      tenant_id: profile.tenant_id,
      category_id: categoryIdByName.get(item.category),
      name: item.name,
      description: item.description,
      image_url: null,
      price_cents: item.price_cents,
      prep_minutes: item.prep_minutes,
      is_available: true,
      is_featured: item.is_featured,
    }))
    .filter((item): item is typeof item & { category_id: string } => Boolean(item.category_id));

  const { error: itemsError } = await supabaseAdmin
    .from("menu_items")
    .upsert(itemRows, { onConflict: "tenant_id,name" });

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  await setFlashToast({
    type: "success",
    message: "Starter menu loaded. You can edit or remove anything later.",
  });

  revalidatePath("/onboarding");
  revalidatePath("/menu");
  revalidatePath("/categories");

  redirect("/onboarding?step=4");
}

export async function updateOnboardingSettingsAction(formData: FormData) {
  const { supabase, profile } = await requireAdmin();
  const currencyCode = String(formData.get("currencyCode") ?? "").trim().toUpperCase();
  const languageCode = String(formData.get("languageCode") ?? "").trim().toLowerCase();
  const currency = currencyOptionFor(currencyCode);
  const language = languageOptionFor(languageCode);

  const { error } = await supabase.from("tenant_settings").upsert({
    tenant_id: profile.tenant_id,
    currency_code: currency.value,
    language_code: language.value,
    locale_identifier: localeIdentifierForLanguage(language.value),
    settings_reviewed_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  await setFlashToast({
    type: "success",
    message: "Settings saved. Your apps will now use these defaults.",
  });

  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/onboarding");

  redirect("/onboarding?step=5");
}

export async function completeOnboardingAction() {
  const { supabase, profile } = await requireAdmin();
  const { count } = await supabase
    .from("orders")
    .select("id", { head: true, count: "exact" })
    .eq("tenant_id", profile.tenant_id);

  if ((count ?? 0) === 0) {
    await setFlashToast({
      type: "info",
      message: "Setup is saved. Place a test order when you're ready and the checklist will keep reminding you.",
    });
    redirect("/");
  }

  const { error } = await supabase
    .from("tenant_settings")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("tenant_id", profile.tenant_id);

  if (error) {
    throw new Error(error.message);
  }

  await setFlashToast({
    type: "success",
    message: "Setup complete. Your family workspace is ready.",
  });

  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/onboarding");

  redirect("/");
}
