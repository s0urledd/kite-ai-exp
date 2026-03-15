import { KiteLogo } from "@/components/common/kite-logo";

const LINKS = ["Docs", "GitHub", "API", "Status"];

export function Footer() {
  return (
    <footer className="max-w-[1280px] mx-auto flex justify-between items-center flex-wrap gap-2 px-6 py-4 text-[13px] text-kite-text-secondary border-t border-kite-border">
      <div className="flex items-center gap-2">
        <KiteLogo size={18} />
        <span>Kite AI Explorer</span>
        <span className="text-kite-text-muted mx-0.5">·</span>
        <span>Chain 2366</span>
      </div>
      <div className="flex gap-5">
        {LINKS.map((l) => (
          <span
            key={l}
            className="text-kite-text-muted hover:text-kite-gold cursor-pointer transition-colors"
          >
            {l}
          </span>
        ))}
      </div>
    </footer>
  );
}
