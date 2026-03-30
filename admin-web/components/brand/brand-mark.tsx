import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  alt?: string;
};

export function BrandMark({ className, alt = "Mommy's Kitchen" }: BrandMarkProps) {
  return (
    <Avatar size="lg" className={cn("bg-transparent shadow-sm after:hidden", className)}>
      <AvatarImage src="/brand/mommys-kitchen-mark.svg" alt={alt} />
      <AvatarFallback className="bg-transparent text-transparent">MK</AvatarFallback>
    </Avatar>
  );
}
