"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type SubmitButtonProps = {
  label: string;
  className?: string;
  disabled?: boolean;
  children?: ReactNode;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
};

export function SubmitButton({
  label,
  className,
  disabled = false,
  children,
  variant = "default",
  size = "default",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button className={className} type="submit" disabled={pending || disabled} variant={variant} size={size}>
      {children}
      {pending ? "Working..." : label}
    </Button>
  );
}
