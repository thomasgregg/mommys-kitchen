"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Settings2,
  Soup,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Current Orders", icon: ClipboardList },
  { href: "/orders/history", label: "Order History", icon: Soup },
  { href: "/users", label: "Users & Roles", icon: Users },
  { href: "/categories", label: "Categories", icon: Boxes },
  { href: "/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/orders") {
    return pathname === "/orders" || /^\/orders\/(?!history$)[^/]+$/.test(pathname);
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const isOnboarding = pathname === "/onboarding" || pathname.startsWith("/onboarding?");

  return (
    <SidebarRoot collapsible="icon" variant="sidebar" className="border-r border-sidebar-border/80">
      <SidebarHeader className="items-center justify-center px-0 py-5 group-data-[collapsible=icon]:py-4">
        <Link
          href="/"
          className="mx-auto flex !size-16 items-center justify-center rounded-full p-0 text-foreground transition hover:bg-transparent group-data-[collapsible=icon]:!size-10"
        >
          <BrandMark className="!size-16 rounded-full group-data-[collapsible=icon]:!size-10" />
        </Link>
      </SidebarHeader>

      {isOnboarding ? null : (
        <>
          <SidebarContent className="px-3 pb-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {links.map((link) => {
                    const active = isActivePath(pathname, link.href);
                    const Icon = link.icon;

                    return (
                      <SidebarMenuItem key={link.href}>
                        <SidebarMenuButton
                          render={<Link href={link.href} />}
                          tooltip={link.label}
                          isActive={active}
                          className={cn(
                            "h-10 rounded-xl px-3 text-sm font-medium text-sidebar-foreground transition-all group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center",
                            active
                              ? "border border-slate-950 bg-background text-foreground shadow-none hover:bg-slate-100 data-active:border-slate-950 data-active:bg-background data-active:text-foreground data-active:shadow-none data-active:hover:bg-slate-100"
                              : "hover:bg-slate-100"
                          )}
                        >
                          <Icon />
                          <span>{link.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarRail />
        </>
      )}
    </SidebarRoot>
  );
}
