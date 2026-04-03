"use client";

import { ImagePlus, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TARGET_RATIO = 4 / 3;
const RATIO_TOLERANCE = 0.18;
const RECOMMENDED_WIDTH = 1600;
const RECOMMENDED_HEIGHT = 1200;

export function MenuPhotoField({
  initialImageUrl,
  compact = false,
}: {
  initialImageUrl?: string | null;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const previewUrl = localPreviewUrl ?? initialImageUrl ?? null;
  const hasSelection = Boolean(localPreviewUrl);

  const triggerPicker = () => {
    inputRef.current?.click();
  };

  const resetSelection = () => {
    setSelectedFileName(null);
    setWarning(null);
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }
    setLocalPreviewUrl(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setWarning(null);

    if (!file) {
      resetSelection();
      return;
    }

    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(objectUrl);
    setSelectedFileName(file.name);

    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      const ratio = width / height;

      if (Math.abs(ratio - TARGET_RATIO) > RATIO_TOLERANCE) {
        setWarning("This photo is a different shape and will be cropped to 4:3.");
        return;
      }

      if (width < RECOMMENDED_WIDTH || height < RECOMMENDED_HEIGHT) {
        setWarning("This photo is smaller than recommended. We’ll still optimize it, but a larger image will look sharper.");
        return;
      }

      setWarning(null);
    };
    image.onerror = () => {
      setWarning("We couldn’t read that image cleanly. Try another photo if the preview looks wrong.");
    };
    image.src = objectUrl;
  };

  const helperText = useMemo(() => {
    if (selectedFileName) {
      return selectedFileName;
    }

    return previewUrl ? null : "No photo selected";
  }, [previewUrl, selectedFileName]);

  const showFooter = Boolean(helperText || warning || hasSelection);

  return (
    <div className={compact ? "space-y-3 sm:col-span-2" : "space-y-4 sm:col-span-2"}>
      <input type="hidden" name="currentImageUrl" value={initialImageUrl ?? ""} />

      <div className="space-y-1">
        <span className="text-sm font-medium text-foreground">Photo</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/70">
        <button
          type="button"
          onClick={triggerPicker}
          className={cn(
            "group relative block aspect-[4/3] w-full overflow-hidden bg-muted/30 text-left outline-none transition",
            "focus-visible:ring-3 focus-visible:ring-ring/50",
          )}
          aria-label={previewUrl ? "Replace photo" : "Choose photo"}
        >
          {previewUrl ? (
            <>
              <img src={previewUrl} alt="Menu photo preview" className="size-full object-cover transition duration-200 group-hover:scale-[1.01]" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/28 group-focus-visible:bg-black/28">
                <div className="rounded-full border border-white/70 bg-black/35 px-3 py-1.5 text-sm font-medium text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  Replace photo
                </div>
              </div>
            </>
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-center text-muted-foreground transition group-hover:bg-muted/50 group-focus-visible:bg-muted/50">
              <ImagePlus className="size-8" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">No photo selected</p>
                <p className="text-xs">Click to choose a photo.</p>
              </div>
            </div>
          )}
        </button>

        {showFooter ? (
          <div className={compact ? "space-y-2.5 border-t border-border/70 p-3" : "space-y-3 border-t border-border/70 p-4"}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                {helperText ? (
                  <p className="truncate text-sm font-medium text-foreground">{helperText}</p>
                ) : null}
                {warning ? (
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-amber-700">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    <span>{warning}</span>
                  </p>
                ) : null}
              </div>
              {hasSelection ? (
                <Button type="button" variant="ghost" size="sm" onClick={resetSelection}>
                  Cancel replacement
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        <input
          ref={inputRef}
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
