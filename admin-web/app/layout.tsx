import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppToaster } from "@/components/providers/app-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FLASH_TOAST_COOKIE } from "@/lib/constants/flash-toast";
import { cn } from "@/lib/utils";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Mommy's Kitchen Admin",
  description: "Kitchen staff dashboard for orders and menu management.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const flashToast = cookieStore.get(FLASH_TOAST_COOKIE)?.value;

  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className={geist.variable}>
        <TooltipProvider>
          <AppToaster flashToast={flashToast} />
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
