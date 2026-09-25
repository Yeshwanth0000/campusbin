import { ImageResponse } from "next/og";

export const runtime = "edge";

// Android crops launcher icons to its own shape (circle, squircle, …), so
// this variant is full-bleed with no rounded corners, and keeps the
// lettering inside the central 80% safe zone the crop never cuts into.
export async function GET() {
  const size = 512;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4f46e5, #10b981)",
          fontSize: size * 0.32,
          fontWeight: 800,
          color: "white",
          fontFamily: "sans-serif",
          letterSpacing: -4,
        }}
      >
        CB
      </div>
    ),
    { width: size, height: size }
  );
}
