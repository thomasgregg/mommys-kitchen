"use client";

import { ImagePlus, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

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

    return previewUrl ? "Current menu photo" : "No photo selected";
  }, [previewUrl, selectedFileName]);

  return (
    <div className={compact ? "space-y-3 sm:col-span-2" : "space-y-4 sm:col-span-2"}>
      <input type="hidden" name="currentImageUrl" value={initialImageUrl ?? ""} />

      <div className="space-y-1">
        <span className="text-sm font-medium text-foreground">Photo</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/70">
        <div className="aspect-[4/3] overflow-hidden bg-muted/30">
          {previewUrl ? (
            <img src={previewUrl} alt="Menu photo preview" className="size-full object-cover" />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <ImagePlus className="size-8" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">No photo selected</p>
                <p className="text-xs">A 4:3 preview will appear here.</p>
              </div>
            </div>
          )}
        </div>

        <div className={compact ? "space-y-2.5 border-t border-border/70 p-3" : "space-y-3 border-t border-border/70 p-4"}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{helperText}</p>
              {warning ? (
                <p className="mt-1 flex items-start gap-1.5 text-sm text-amber-700">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>{warning}</span>
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={triggerPicker}>
                {previewUrl ? "Replace photo" : "Choose photo"}
              </Button>
              {hasSelection ? (
                <Button type="button" variant="ghost" size="sm" onClick={resetSelection}>
                  Cancel replacement
                </Button>
              ) : null}
            </div>
          </div>

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
    </div>
  );
}
