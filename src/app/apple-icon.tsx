import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontSize: 84,
          fontWeight: 800,
          color: "white",
          fontFamily: "sans-serif",
          letterSpacing: -2,
        }}
      >
        CB
      </div>
    ),
    { ...size }
  );
}
