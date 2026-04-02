"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/lib/actions/auth";
import type { Profile } from "@/lib/types/app";

export function UserNav({ profile }: { profile: Profile }) {
  const initials = getInitials(profile.full_name);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-lg" className="rounded-full p-0 hover:bg-transparent">
            <Avatar size="lg" className="bg-white shadow-sm">
              <AvatarFallback className="bg-white font-semibold text-foreground">{initials}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56 min-w-56 bg-white">
        <DropdownMenuGroup className="px-1.5 py-1">
          <DropdownMenuItem render={<Link href={`/users/${profile.id}`} />}>
            <UserRound />
            My profile
          </DropdownMenuItem>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-slate-100"
            >
              <LogOut className="size-4" />
              <span>Sign out</span>
            </button>
          </form>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getInitials(name?: string | null) {
  const fallback = "KA";

  if (!name) {
    return fallback;
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return fallback;
  }

  return parts
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
