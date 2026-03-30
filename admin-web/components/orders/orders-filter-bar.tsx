"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";

export function OrdersFilterBar({
  initialQuery,
  placeholder = "Search order, guest, phone, or item",
}: {
  initialQuery: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasMountedRef = useRef(false);

  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmedQuery = query.trim();

      if (trimmedQuery) {
        params.set("q", trimmedQuery);
      } else {
        params.delete("q");
      }

      const nextQueryString = params.toString();
      const currentQueryString = searchParams.toString();

      if (nextQueryString !== currentQueryString) {
        router.replace(nextQueryString ? `${pathname}?${nextQueryString}` : pathname, { scroll: false });
      }
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [pathname, query, router, searchParams]);

  return (
    <div>
      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className="h-10 bg-background"
      />
    </div>
  );
}
