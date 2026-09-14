// The CB mark: bold initials on the indigo-to-emerald gradient already used
// for the "swap" motif elsewhere in the app — chosen over a pictorial icon
// so there's no symbol to decode, just two letters to recognize over time.
export default function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="CampusBin"
      className={className}
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="1" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#logo-gradient)" />
      <text
        x="50"
        y="53"
        textAnchor="middle"
        dominantBaseline="central"
        fontWeight={800}
        fontSize={42}
        letterSpacing={-2}
        fill="#ffffff"
        style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
      >
        CB
      </text>
    </svg>
  );
}
