import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // Browsers already derive the app's identity from start_url; pinning it
    // explicitly keeps existing installs intact if start_url ever changes.
    id: "/browse",
    name: "CampusBin — Your Campus Marketplace",
    short_name: "CampusBin",
    description: "Buy and sell with verified students on your own campus.",
    start_url: "/browse",
    scope: "/",
    display: "standalone",
    lang: "en-IN",
    categories: ["shopping", "lifestyle"],
    background_color: "#ffffff",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
