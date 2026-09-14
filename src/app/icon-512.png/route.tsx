import { ImageResponse } from "next/og";

export const runtime = "edge";

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
          borderRadius: size * 0.22,
          fontSize: size * 0.46,
          fontWeight: 800,
          color: "white",
          fontFamily: "sans-serif",
          letterSpacing: -6,
        }}
      >
        CB
      </div>
    ),
    { width: size, height: size }
  );
}
