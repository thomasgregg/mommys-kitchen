"use client";

import { useMemo, useState } from "react";
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

export function SelectField({
  name,
  defaultValue,
  options,
  placeholder,
  className,
}: {
  name: string;
  defaultValue?: string;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}) {
  const initialValue = defaultValue ?? options[0]?.value ?? "";
  const [value, setValue] = useState(initialValue);
  const selectedLabel = useMemo(
    () => options.find((option) => option.value === value)?.label,
    [options, value],
  );

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Select value={value} onValueChange={(nextValue) => setValue(nextValue ?? "")}>
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
    </>
  );
}
