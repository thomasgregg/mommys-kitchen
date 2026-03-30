import { cookies } from "next/headers";
import { FLASH_TOAST_COOKIE, type FlashToastPayload } from "@/lib/constants/flash-toast";

export async function setFlashToast(payload: FlashToastPayload) {
  const cookieStore = await cookies();
  cookieStore.set(FLASH_TOAST_COOKIE, JSON.stringify(payload), {
    path: "/",
    maxAge: 30,
    sameSite: "lax",
    httpOnly: false,
  });
}
