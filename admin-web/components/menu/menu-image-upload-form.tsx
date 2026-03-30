import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { uploadMenuImageAction } from "@/lib/actions/menu";
import type { MenuItem } from "@/lib/types/app";

export function MenuImageUploadForm({
  item,
  isEnabled,
}: {
  item: MenuItem;
  isEnabled: boolean;
}) {
  if (!isEnabled) {
    return null;
  }

  return (
    <form action={uploadMenuImageAction} className="space-y-4 rounded-2xl border border-border/70 bg-white p-4">
      <input type="hidden" name="id" value={item.id} />

      <label className="space-y-2">
        <span className="text-sm font-medium text-foreground">Replace photo</span>
        <Input
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="h-auto rounded-xl bg-background px-3 py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
        />
      </label>

      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Uploads the image to Supabase Storage and updates the menu item automatically.
        </p>
        <div className="flex justify-end">
          <SubmitButton label="Upload photo" variant="outline" size="lg" className="h-10 rounded-xl px-4" />
        </div>
      </div>
    </form>
  );
}
