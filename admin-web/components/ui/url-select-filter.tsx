"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SelectOption = {
  value: string;
  label: string;
};

export function UrlSelectFilter({
  queryKey,
  initialValue,
  options,
  placeholder,
  className,
}: {
  queryKey: string;
  initialValue?: string;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initial = initialValue ?? options[0]?.value ?? "";
  const [value, setValue] = useState(initial);

  const selectedLabel = useMemo(
    () => options.find((option) => option.value === value)?.label,
    [options, value],
  );

  function handleValueChange(nextValue: string) {
    setValue(nextValue);

    const params = new URLSearchParams(searchParams.toString());

    if (!nextValue || nextValue === "all") {
      params.delete(queryKey);
    } else {
      params.set(queryKey, nextValue);
    }

    const nextQueryString = params.toString();
    router.replace(nextQueryString ? `${pathname}?${nextQueryString}` : pathname, { scroll: false });
  }

  return (
    <Select value={value} onValueChange={(nextValue) => handleValueChange(nextValue ?? "")}>
      <SelectTrigger className={cn("h-10 w-full", className)}>
        <span className={cn("flex flex-1 items-center text-left", !selectedLabel && "text-muted-foreground")}>
          {selectedLabel ?? placeholder}
        </span>
      </SelectTrigger>
      <SelectContent align="start">
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
