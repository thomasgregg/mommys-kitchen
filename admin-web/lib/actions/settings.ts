"use server";

import { revalidatePath } from "next/cache";
import { currencyOptionFor, languageOptionFor, localeIdentifierForLanguage } from "@/lib/constants/app-settings";
import { requireAdmin } from "@/lib/auth/require-admin";
import { setFlashToast } from "@/lib/utils/flash-toast";

export async function updateAppSettingsAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const currencyCode = String(formData.get("currencyCode") ?? "").trim().toUpperCase();
  const languageCode = String(formData.get("languageCode") ?? "").trim().toLowerCase();
  const currency = currencyOptionFor(currencyCode);
  const language = languageOptionFor(languageCode);

  const { error } = await supabase.from("app_settings").upsert({
    singleton_key: "global",
    currency_code: currency.value,
    language_code: language.value,
    locale_identifier: localeIdentifierForLanguage(language.value),
  });

  if (error) {
    throw new Error(error.message);
  }

  await setFlashToast({
    type: "success",
    message: `Settings updated to ${currency.label} and ${language.label}.`,
  });

  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/orders");
  revalidatePath("/orders/history");
  revalidatePath("/users");
  revalidatePath("/menu");
  revalidatePath("/settings");
}
