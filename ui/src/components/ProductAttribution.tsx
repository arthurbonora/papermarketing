/** Keep the upstream attribution in the product footer. */
export function ProductAttribution({ compact = false }: { compact?: boolean }) {
  if (compact) return null;
  return (
    <footer className="shrink-0 px-3 py-2 text-center text-xs text-muted-foreground">
      <a href="https://github.com/paperclipai/paperclip" target="_blank" rel="noopener noreferrer"
        className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Built on Paperclip
      </a>
    </footer>
  );
}
