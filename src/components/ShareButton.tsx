import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ShareButton({ path, title }: { path: string; title?: string }) {
  async function share() {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: title ?? "Recipe", url });
        return;
      }
    } catch {
      /* fall through */
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Couldn't copy the link");
    }
  }

  return (
    <Button onClick={share} variant="outline" size="sm" className="rounded-full">
      <Share2 className="mr-2 h-4 w-4" /> Share
    </Button>
  );
}
