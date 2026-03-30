export const FLASH_TOAST_COOKIE = "mk-admin-toast";

export type FlashToastPayload = {
  type: "success" | "error" | "info";
  message: string;
};
