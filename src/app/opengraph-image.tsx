import { ImageResponse } from "next/og";

// Individual listings deliberately have no share card: they're RLS-scoped to
// the viewer's college, so a preview bot with no session can't see them (see
// the note in listings/[id]/generateMetadata). What people actually share for
// a college-private marketplace is the invite link, so that's what this card
// is for.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "CampusBin — buy and sell with verified students on your own campus";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          position: "relative",
          padding: "80px",
          background:
            "radial-gradient(circle at 90% -10%, rgba(109,107,245,0.5) 0%, rgba(109,107,245,0) 55%), radial-gradient(circle at -10% 115%, rgba(52,211,153,0.38) 0%, rgba(52,211,153,0) 55%), linear-gradient(160deg, #100e21 0%, #060611 65%)",
          color: "#f4f3fa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 46 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 14,
              marginRight: 18,
              background: "linear-gradient(135deg, #6d6bf5, #34d399)",
              color: "#060611",
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: -1,
            }}
          >
            CB
          </div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, letterSpacing: "0.02em" }}>
            CampusBin
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 92,
            fontWeight: 800,
            lineHeight: 1.04,
            letterSpacing: "-0.02em",
          }}
        >
          Buy and sell,
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 92,
            fontWeight: 800,
            lineHeight: 1.04,
            letterSpacing: "-0.02em",
            marginBottom: 34,
            backgroundImage: "linear-gradient(95deg, #6d6bf5 10%, #34d399 90%)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          campus to campus.
        </div>

        <div style={{ display: "flex", fontSize: 32, color: "#9997b3" }}>
          Verified by your college email. Private to your campus.
        </div>

        <div
          style={{
            display: "flex",
            position: "absolute",
            right: 80,
            bottom: 64,
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: "#f4f3fa",
            opacity: 0.85,
          }}
        >
          campusbin.in
        </div>
      </div>
    ),
    size
  );
}
