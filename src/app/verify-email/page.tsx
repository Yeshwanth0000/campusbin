export const metadata = { title: "Check your inbox — CampusBin" };

export default function VerifyEmailPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Check your inbox</h1>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        We&rsquo;ve sent a confirmation link to your college email address.
        Click it to verify your account and unlock your campus marketplace.
      </p>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Don&rsquo;t see it? Check your spam folder, or make sure you used
        your official college email.
      </p>
    </div>
  );
}
