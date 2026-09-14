import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://campusbin.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/signup", "/terms", "/safety", "/about"],
      // Everything else is college-private and already behind the auth guard;
      // listing it here keeps crawlers from hammering redirects to /login.
      disallow: [
        "/browse",
        "/chat",
        "/listings",
        "/profile",
        "/saved",
        "/saved-searches",
        "/sell",
        "/sellers",
        "/notifications",
        "/admin",
        "/auth",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
