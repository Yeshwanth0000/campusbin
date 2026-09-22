import type { ReactNode } from "react";

export const CATEGORY_ICONS: Record<string, string> = {
  books: "📚",
  electronics: "💻",
  cycles: "🚲",
  "hostel-essentials": "🏠",
  fashion: "👕",
  furniture: "🛋️",
  sports: "⚽",
  stationery: "📐",
  "musical-instruments": "🎸",
  gaming: "🎮",
  vehicles: "🛵",
  appliances: "🔌",
  "movie-tickets": "🎟️",
  other: "📦",
};

// No emoji depicts an actual room/desert cooler — the boxy evaporative
// units common in Indian hostels — so this one category gets a drawn icon
// instead of forcing an emoji that reads as something else (AC, wind,
// snow). Sized in em so it matches the emoji siblings at every call site's
// font-size.
function CoolerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
      <rect x="3" y="4" width="18" height="14" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
      <line x1="5" y1="8" x2="19" y2="8" stroke="#64748b" strokeWidth="1" />
      <line x1="5" y1="11" x2="19" y2="11" stroke="#64748b" strokeWidth="1" />
      <line x1="5" y1="14" x2="19" y2="14" stroke="#64748b" strokeWidth="1" />
      <circle cx="12" cy="11" r="3" fill="#38bdf8" opacity="0.85" />
      <path d="M12 8.5V13.5M9.5 11H14.5" stroke="#0ea5e9" strokeWidth="1" />
      <rect x="5" y="18" width="2" height="2" fill="#64748b" />
      <rect x="17" y="18" width="2" height="2" fill="#64748b" />
    </svg>
  );
}

// Unicode's actual calculator character (U+1F5A9) isn't a recommended
// emoji, so most fonts render it as plain black-and-white text or don't
// carry it at all — the closest reliable stand-in (an abacus) doesn't
// look like a calculator. Drawn instead, for the same reason as coolers.
function CalculatorIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
      <rect x="5" y="2" width="14" height="20" rx="2" fill="#475569" stroke="#1e293b" strokeWidth="1" />
      <rect x="7" y="4.5" width="10" height="4" rx="0.5" fill="#bbf7d0" />
      <rect x="7" y="10.5" width="2.6" height="2.2" rx="0.4" fill="#cbd5e1" />
      <rect x="10.7" y="10.5" width="2.6" height="2.2" rx="0.4" fill="#cbd5e1" />
      <rect x="14.4" y="10.5" width="2.6" height="2.2" rx="0.4" fill="#f97316" />
      <rect x="7" y="13.4" width="2.6" height="2.2" rx="0.4" fill="#cbd5e1" />
      <rect x="10.7" y="13.4" width="2.6" height="2.2" rx="0.4" fill="#cbd5e1" />
      <rect x="14.4" y="13.4" width="2.6" height="2.2" rx="0.4" fill="#cbd5e1" />
      <rect x="7" y="16.3" width="2.6" height="2.2" rx="0.4" fill="#cbd5e1" />
      <rect x="10.7" y="16.3" width="2.6" height="2.2" rx="0.4" fill="#cbd5e1" />
      <rect x="14.4" y="16.3" width="2.6" height="2.2" rx="0.4" fill="#cbd5e1" />
    </svg>
  );
}

export function categoryIcon(slug: string): ReactNode {
  if (slug === "coolers") return <CoolerIcon />;
  if (slug === "calculators") return <CalculatorIcon />;
  return CATEGORY_ICONS[slug] ?? "🏷️";
}
