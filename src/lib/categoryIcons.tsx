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

export function categoryIcon(slug: string): ReactNode {
  if (slug === "coolers") return <CoolerIcon />;
  return CATEGORY_ICONS[slug] ?? "🏷️";
}
