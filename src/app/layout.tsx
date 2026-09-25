import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import ThemeInitScript from "@/components/ThemeInitScript";
import ToastContainer from "@/components/ToastContainer";
import PageTransition from "@/components/PageTransition";
import AmbientBackground from "@/components/AmbientBackground";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://campusbin.in";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "CampusBin — Your Campus Marketplace",
  description: "Buy and sell with verified students on your own campus.",
  // Sharing an invite link is how a college-private marketplace grows, and
  // until now those links previewed as a bare URL with no title or image.
  // opengraph-image.tsx supplies the card.
  openGraph: {
    type: "website",
    siteName: "CampusBin",
    title: "CampusBin — Your Campus Marketplace",
    description: "Buy and sell with verified students on your own campus.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "CampusBin — Your Campus Marketplace",
    description: "Buy and sell with verified students on your own campus.",
  },
  verification: {
    google: "ocCxD2sreL6eHxLCqbma3-WGDugkUfj3de3kNryLVt8",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

// Tells Google what CampusBin actually is (a specific student marketplace
// entity), separate from ranking for "campusbin" the search term — this is
// the same signal that helps disambiguate against generic "campus bin"
// waste-container results in things like AI Overviews. No SearchAction here:
// /browse is behind auth and disallowed in robots.txt, so advertising a
// public sitelinks search box would point anonymous visitors at a page they
// can't actually use.
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "CampusBin",
      url: SITE_URL,
      logo: `${SITE_URL}/icon`,
      description: "A private, verified-student marketplace for buying and selling within your own college campus.",
    },
    {
      "@type": "WebSite",
      name: "CampusBin",
      url: SITE_URL,
    },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
        <ThemeInitScript nonce={nonce} />
        <AmbientBackground />
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[200] -translate-y-20 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <Header />
        <main id="main-content" className="flex-1 pb-16 lg:pb-0">
          <PageTransition>{children}</PageTransition>
        </main>
        <ToastContainer />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
