"use client";

import { useEffect } from "react";

// error.tsx can't catch a failure in the root layout itself (e.g. Header's
// data fetching) — this is the only boundary that can, and per Next.js
// rules it has to render its own <html>/<body> since it replaces the
// entire root layout when it fires.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-white px-4 antialiased">
        <div className="flex max-w-md flex-col items-center text-center">
          <p className="text-sm font-semibold text-indigo-600">Something went wrong</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">CampusBin hit a snag</h1>
          <p className="mt-2 text-sm text-slate-600">
            It&rsquo;s not you — something broke loading the app. Give it another try.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
