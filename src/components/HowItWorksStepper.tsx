"use client";

import { useEffect, useState } from "react";

const STEPS = [
  {
    title: "Sign up with your college email",
    description: "We check the domain and verify you belong to your campus.",
  },
  {
    title: "Browse or post in your marketplace",
    description: "Only students from your own college ever see your listings.",
  },
  {
    title: "Chat, meet up, done",
    description: "Agree on a price in-app, meet on campus, exchange cash in person.",
  },
];

export default function HowItWorksStepper() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setActive((i) => (i + 1) % STEPS.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [paused]);

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        How a CampusBin community starts
      </p>

      <div className="mt-4 flex h-40 items-center justify-center rounded-xl bg-brand-light">
        <StepIllustration step={active} />
      </div>

      <ol className="mt-5 space-y-1">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <button
              type="button"
              onClick={() => setActive(i)}
              className={`flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
                active === i ? "bg-brand-light" : "hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  active === i ? "bg-brand text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {i + 1}
              </span>
              <span>
                <span
                  className={`block text-sm font-semibold ${
                    active === i ? "text-brand-dark" : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {step.title}
                </span>
                {active === i && (
                  <span className="mt-0.5 block text-xs text-slate-600 dark:text-slate-300">
                    {step.description}
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepIllustration({ step }: { step: number }) {
  if (step === 0) {
    return (
      <div className="w-48 rounded-lg bg-white p-3 shadow-md">
        <div className="h-2 w-16 rounded bg-slate-200" />
        <div className="mt-2 h-8 rounded-md border border-slate-200 px-2 text-[10px] leading-8 text-slate-500">
          you@college.ac.in
        </div>
        <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white">
            ✓
          </span>
          Verified
        </div>
      </div>
    );
  }
  if (step === 1) {
    return (
      <div className="grid w-48 grid-cols-3 gap-2">
        {["📚", "💻", "🚲"].map((icon) => (
          <div
            key={icon}
            className="flex aspect-square items-center justify-center rounded-lg bg-white text-xl shadow-md"
          >
            {icon}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="w-48 space-y-1.5">
      <div className="ml-auto w-2/3 rounded-2xl rounded-tr-sm bg-brand px-3 py-1.5 text-[10px] text-white shadow-md">
        Still available?
      </div>
      <div className="w-2/3 rounded-2xl rounded-tl-sm bg-white px-3 py-1.5 text-[10px] text-slate-700 shadow-md">
        Yes! Meet at the library?
      </div>
    </div>
  );
}
