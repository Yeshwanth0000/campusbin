export const metadata = { title: "Privacy Policy — CampusBin" };

const SECTIONS = [
  {
    title: "What we collect",
    body: "To create an account we collect your name, college email address, and a password. You can optionally add a phone number and profile photo. Listings you post include their photos, description, price, and category. If you enable push notifications, your browser's push subscription is stored so we can deliver them.",
  },
  {
    title: "Why we collect it",
    body: "Your college email verifies you're a real student before you can buy or sell. Everything else exists to run the marketplace itself — showing your listings to other students on your campus, letting buyers message or call you if you opt in, and notifying you about activity on your account. We don't run ads and don't use your data for anything beyond operating CampusBin.",
  },
  {
    title: "Photo moderation",
    body: "Listing photos are automatically scanned by Amazon Rekognition, a third-party image-analysis service, before a listing goes live. This check looks only for prohibited content (explicit, violent, or otherwise unsafe imagery) and is not used to identify people or for any other purpose.",
  },
  {
    title: "Who can see what",
    body: "Listings, and the name and photo attached to them, are visible only to verified students on your own campus — never the public internet or students at other colleges. Your phone number is shown to other students only if you turn on \"Show my phone number\" when posting; otherwise buyers can only reach you through CampusBin's own messaging.",
  },
  {
    title: "Where it's stored",
    body: "Data is stored with Supabase (our database, authentication, and file storage provider) and the app is hosted on Vercel. We don't sell your data or share it with advertisers. We may disclose information if required by law or to investigate abuse reported through the platform.",
  },
  {
    title: "Your controls",
    body: "From your profile you can edit or remove your phone number and photo at any time, export a copy of your data as a JSON file, or permanently delete your account — which removes your profile, listings, messages, and saved items.",
  },
  {
    title: "Changes",
    body: "This is a small, evolving student project, so this policy may change as the platform grows. Continued use after a change means you accept the update.",
  },
  {
    title: "Contact",
    body: "Questions about this policy or your data? Reach out through the contact details on our About page.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Privacy Policy</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Last updated {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long" })}
      </p>

      <ol className="mt-8 divide-y divide-slate-200/70 dark:divide-slate-800/70">
        {SECTIONS.map((section, i) => (
          <li key={section.title} className="flex gap-4 py-5 first:pt-0 last:pb-0">
            <span
              aria-hidden
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold tabular-nums text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            >
              {i + 1}
            </span>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">{section.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {section.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
