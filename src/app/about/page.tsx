// UPI ID for the optional "support this project" link below.
const SUPPORT_UPI_ID: string | null = "9652682587@axl";

export const metadata = { title: "About — CampusBin" };

export default function AboutPage() {
  const supportHref = SUPPORT_UPI_ID
    ? `upi://pay?pa=${encodeURIComponent(SUPPORT_UPI_ID)}&pn=CampusBin&cu=INR`
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">About CampusBin</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        Why this exists, who runs it, and how it stays free.
      </p>

      <div className="mt-6 space-y-4">
        <section className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-800/40">
          <h2 className="flex items-center gap-2.5 font-semibold text-slate-900 dark:text-slate-100">
            <span aria-hidden className="text-lg">
              🎓
            </span>
            Why CampusBin exists
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            Buying and selling something on campus usually means scrolling
            through scattered WhatsApp groups — no way to tell if a listing
            is still available, or if the person on the other end is even
            someone from your own college. CampusBin started as a
            single-student side project at NIT Rourkela to fix that: every
            campus gets its own private, verified marketplace instead.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-800/40">
          <h2 className="flex items-center gap-2.5 font-semibold text-slate-900 dark:text-slate-100">
            <span aria-hidden className="text-lg">
              🧑‍💻
            </span>
            Who runs it
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            CampusBin is built and maintained by one student, in spare time
            between classes. There&rsquo;s no company behind it and no
            investors — just an independent project, not affiliated with or
            operated on behalf of any college.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-800/40">
          <h2 className="flex items-center gap-2.5 font-semibold text-slate-900 dark:text-slate-100">
            <span aria-hidden className="text-lg">
              💸
            </span>
            How it stays free
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            CampusBin never takes a cut of anything bought or sold — every
            trade happens directly between students, in cash or UPI, in
            person. Running the site costs very little, and it&rsquo;s free
            for every verified student to use. CampusBin is free to use. If
            that ever changes, it&rsquo;ll stay simple and fair.
          </p>
        </section>

        <section
          id="support"
          className="scroll-mt-20 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-800/40"
        >
          <h2 className="flex items-center gap-2.5 font-semibold text-slate-900 dark:text-slate-100">
            <span aria-hidden className="text-lg">
              ☕
            </span>
            Support this project
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            If CampusBin has been useful to you, you&rsquo;re welcome to
            chip in toward keeping it running. This is completely optional,
            doesn&rsquo;t unlock anything, and has nothing to do with any
            specific trade — it&rsquo;s just a way to say thanks if you feel
            like it.
          </p>
          {supportHref ? (
            <a
              href={supportHref}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Support CampusBin
            </a>
          ) : (
            <p className="mt-4 text-xs italic text-slate-400 dark:text-slate-500">
              (Support link coming soon.)
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
