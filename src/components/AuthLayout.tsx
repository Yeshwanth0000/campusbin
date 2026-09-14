import GradientMesh from "./GradientMesh";
import Logo from "./Logo";

// The panel is the same brand furniture on every auth page, so the steps live
// here rather than being passed in. All four pages used to declare their own
// identical copy, which is how the old "circle" wording survived a rename in
// four places at once.
const STEPS = [
  { title: "Sign up with your college email", description: "We verify you belong to your campus." },
  { title: "Land in your college's own marketplace", description: "Isolated from every other campus." },
  { title: "Buy, sell, chat", description: "All in person, all on campus." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-4xl items-center px-4 py-10">
      <div className="grid w-full animate-auth-card-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2">
        {/* Fixed dark gradient-mesh panel — deliberately doesn't follow site
            theme, same way a brand hero panel stays put regardless of light
            or dark mode. */}
        <div className="relative hidden flex-col justify-center overflow-hidden bg-slate-950 p-10 sm:flex">
          <GradientMesh />
          <Logo size={48} className="relative rounded-xl" />
          <h2 className="relative mt-5 text-xl font-bold text-white">CampusBin</h2>
          <p className="relative mt-2 text-sm text-slate-300">
            The private marketplace for your own campus — buy, sell, and trade
            with people you can actually trust.
          </p>
          <ul className="relative mt-8 space-y-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white backdrop-blur-sm">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{step.title}</p>
                  <p className="text-xs text-slate-400">{step.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col justify-center p-8 sm:p-10">{children}</div>
      </div>
    </div>
  );
}
