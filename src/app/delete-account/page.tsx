import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata = { title: "Delete your account — CampusBin" };

export default function DeleteAccountInfoPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Delete your CampusBin account
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        You can delete your account and data at any time. Deleting is permanent and can&apos;t be
        undone.
      </p>

      <h2 className="mt-8 font-semibold text-slate-900 dark:text-slate-100">
        Option 1: delete it yourself in the app
      </h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        <li>
          Log in to CampusBin and open your{" "}
          <Link href="/profile" className="font-medium text-brand hover:underline">
            profile
          </Link>
          .
        </li>
        <li>Scroll to the &quot;Danger zone&quot; section and tap Delete account.</li>
        <li>Confirm. Your account is removed immediately.</li>
      </ol>

      <h2 className="mt-8 font-semibold text-slate-900 dark:text-slate-100">
        Option 2: ask us to delete it
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        If you can&apos;t log in, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand hover:underline">
          {CONTACT_EMAIL}
        </a>{" "}
        from the college email address on the account, with the subject &quot;Delete my
        account&quot;. We&apos;ll delete it and reply to confirm.
      </p>

      <h2 className="mt-8 font-semibold text-slate-900 dark:text-slate-100">What gets deleted</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        Your profile (name, photo, phone number), login, listings and their photos, chat messages,
        saved listings and searches, blocks, reports you filed, notifications, and push
        notification subscriptions. Chats you were part of are removed for the other person too.
        We don&apos;t keep a backup copy of this data for later restoration.
      </p>

      <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
        See also our{" "}
        <Link href="/privacy" className="text-brand hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
