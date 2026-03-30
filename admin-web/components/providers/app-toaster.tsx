"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { FLASH_TOAST_COOKIE, type FlashToastPayload } from "@/lib/constants/flash-toast";

export function AppToaster({ flashToast }: { flashToast?: string }) {
  const lastShown = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!flashToast || flashToast === lastShown.current) {
      return;
    }

    lastShown.current = flashToast;

    try {
      const payload = JSON.parse(flashToast) as FlashToastPayload;
      const method =
        payload.type === "success" ? toast.success : payload.type === "error" ? toast.error : toast;
      method(payload.message);
      document.cookie = `${FLASH_TOAST_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    } catch {
      document.cookie = `${FLASH_TOAST_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    }
  }, [flashToast]);

  return <Toaster position="top-right" richColors closeButton />;
}
