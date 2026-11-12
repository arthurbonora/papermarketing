import type { SVGProps } from "react";
import { cn } from "../lib/utils";
import { PapermarketingMark } from "./PapermarketingLockup";

export function AnimatedPaperclipIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <PapermarketingMark className={cn("motion-safe:animate-pulse", className)} {...props} />
  );
}

/** Full-page loading state with the Papermarketing monogram. */
export function PaperclipLoading({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={cn("flex min-h-dvh w-full items-center justify-center", className)}
    >
      <AnimatedPaperclipIcon className="h-24 w-24 text-muted-foreground" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
