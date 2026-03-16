"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { KiteLogo } from "@/components/common/kite-logo";
import { useTheme } from "@/lib/hooks/use-theme";

interface NavItem {
  href: string;
  label: string;
  match: string[];
  children?: { href: string; label: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", match: ["/"] },
  {
    href: "/blocks",
    label: "Blockchain",
    match: ["/blocks", "/block/", "/txs", "/tx/", "/top-accounts"],
    children: [
      { href: "/blocks", label: "Blocks" },
      { href: "/txs", label: "Transactions" },
      { href: "/top-accounts", label: "Top Accounts" },
    ],
  },
  { href: "/tokens", label: "Tokens", match: ["/tokens", "/token/"] },
  { href: "/contracts", label: "Contracts", match: ["/contracts"] },
  { href: "/stats", label: "Charts & Stats", match: ["/stats"] },
  { href: "/api-docs", label: "API", match: ["/api-docs"] },
];

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-kite-bg/95 backdrop-blur-md border-b border-kite-border">
      <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-14">
        {/* Left */}
        <div className="flex items-center gap-3">
          <KiteLogo size={26} />

          <div className="flex gap-0.5 ml-3" ref={dropdownRef}>
            {NAV_ITEMS.map((item) => {
              const active = item.match.some((m) => m === "/" ? pathname === "/" : pathname.startsWith(m));

              if (item.children) {
                const isOpen = openDropdown === item.label;
                return (
                  <div key={item.href} className="relative">
                    <button
                      onClick={() => setOpenDropdown(isOpen ? null : item.label)}
                      className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-1 ${
                        active
                          ? "text-kite-gold bg-kite-gold-faint"
                          : "text-kite-text-secondary hover:text-kite-gold hover:bg-kite-gold-faint"
                      }`}
                    >
                      {item.label}
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {isOpen && (
                      <div className="absolute top-full left-0 mt-1.5 min-w-[160px] bg-kite-surface rounded-lg border border-white/[0.06] shadow-xl shadow-black/40 py-1 overflow-hidden">
                        {item.children.map((child) => {
                          const childActive = pathname.startsWith(child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setOpenDropdown(null)}
                              className={`block px-4 py-2 text-[13px] font-medium transition-colors ${
                                childActive
                                  ? "text-kite-gold bg-kite-gold-faint"
                                  : "text-kite-text-secondary hover:text-kite-gold hover:bg-kite-gold-faint"
                              }`}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                    active
                      ? "text-kite-gold bg-kite-gold-faint"
                      : "text-kite-text-secondary hover:text-kite-gold hover:bg-kite-gold-faint"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2.5">
          {/* Theme Toggle */}
          <button
            onClick={toggle}
            className="w-8 h-8 rounded-lg border border-kite-border bg-kite-surface flex items-center justify-center text-kite-text-muted hover:text-kite-gold hover:border-kite-gold/20 transition-all"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-kite-border bg-kite-surface text-kite-text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.4)]" />
            <span className="text-xs">Mainnet</span>
          </div>

          {/* Wallet connect - disabled for now */}
        </div>
      </div>
    </nav>
  );
}
