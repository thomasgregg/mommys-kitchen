"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setFlashToast } from "@/lib/utils/flash-toast";
import { statusLabel } from "@/lib/utils/admin-ui";

function extractErrorMessage(rawMessage: string) {
  try {
    const parsed = JSON.parse(rawMessage) as { error?: string; message?: string };
    return parsed.error || parsed.message || rawMessage;
  } catch {
    return rawMessage;
  }
}

export async function updateOrderStatusAction(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const newStatus = String(formData.get("newStatus") ?? "");
  const note = String(formData.get("note") ?? "").trim() || undefined;

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Admin session not found.");
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-order-status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      order_id: orderId,
      new_status: newStatus,
      note,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = extractErrorMessage(await response.text());
    throw new Error(message || "Failed to update order status.");
  }

  const friendlyStatus = statusLabel(newStatus);
  await setFlashToast({ type: "success", message: `Order moved to ${friendlyStatus}.` });

  revalidatePath("/orders");
  revalidatePath("/orders/history");
  revalidatePath(`/orders/${orderId}`);
}
