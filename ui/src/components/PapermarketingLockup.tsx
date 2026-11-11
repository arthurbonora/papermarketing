import type { SVGProps } from "react";

export function PapermarketingMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 222 128" aria-hidden="true" focusable="false" {...props}>
      <use href="/brands/papermarketing.svg#monogram" />
    </svg>
  );
}

export function PapermarketingLockup() {
  return (
    <span className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight">
      <PapermarketingMark className="h-5 w-auto shrink-0" />
      Papermarketing
    </span>
  );
}
