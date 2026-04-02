"use client";

import { useRef } from "react";
import { Trash2, TriangleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ConfirmSubmitActionProps = {
  title: string;
  description: string;
  confirmLabel: string;
  disabled?: boolean;
  action: (formData: FormData) => void | Promise<void>;
  values: Record<string, string>;
  triggerLabel: string;
};

export function ConfirmSubmitAction({
  title,
  description,
  confirmLabel,
  disabled = false,
  action,
  values,
  triggerLabel,
}: ConfirmSubmitActionProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-lg text-foreground hover:bg-slate-100 hover:text-foreground"
            disabled={disabled}
            aria-label={triggerLabel}
          >
            <Trash2 className="size-4" />
          </Button>
        }
      />
      <AlertDialogContent
        size="default"
        className="isolate max-w-lg overflow-hidden border border-border bg-white p-0 shadow-2xl"
      >
        <div className="flex flex-col">
          <div className="flex flex-col gap-3 px-6 py-5 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <TriangleAlert className="size-5" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
              <p className="mx-auto max-w-md text-sm leading-7 text-muted-foreground">{description}</p>
            </div>
          </div>

          <div className="border-t border-border bg-white px-6 py-3">
            <form ref={formRef} action={action} className="flex items-center justify-center gap-6">
              {Object.entries(values).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}

              <AlertDialogCancel variant="ghost" size="sm" className="px-3">
                Cancel
              </AlertDialogCancel>

              <AlertDialogAction
                type="button"
                variant="ghost"
                size="sm"
                className="px-3 text-destructive hover:bg-slate-100 hover:text-destructive"
                onClick={() => formRef.current?.requestSubmit()}
              >
                {confirmLabel}
              </AlertDialogAction>
            </form>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
