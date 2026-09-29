"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const EXAMPLES = [
  "Calculator",
  "Cycle for hostel commute",
  "Engineering textbooks",
  "Badminton racket",
  "Study table lamp",
];

export default function HeroSearch() {
  const router = useRouter();
  const [placeholder, setPlaceholder] = useState("");
  const [value, setValue] = useState("");

  useEffect(() => {
    let exampleIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timeout: ReturnType<typeof setTimeout>;

    function tick() {
      const current = EXAMPLES[exampleIndex];

      if (!deleting) {
        charIndex++;
        setPlaceholder(`Try "${current.slice(0, charIndex)}"`);
        if (charIndex === current.length) {
          deleting = true;
          timeout = setTimeout(tick, 1400);
          return;
        }
        timeout = setTimeout(tick, 55);
      } else {
        charIndex--;
        setPlaceholder(`Try "${current.slice(0, charIndex)}"`);
        if (charIndex === 0) {
          deleting = false;
          exampleIndex = (exampleIndex + 1) % EXAMPLES.length;
          timeout = setTimeout(tick, 300);
          return;
        }
        timeout = setTimeout(tick, 25);
      }
    }

    timeout = setTimeout(tick, 400);
    return () => clearTimeout(timeout);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push("/signup");
  }

  return (
    <form onSubmit={handleSubmit} className="relative mt-2 max-w-md">
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 dark:text-slate-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-slate-300 bg-white py-3.5 pl-11 pr-28 text-sm text-slate-900 shadow-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
      <button
        type="submit"
        className="absolute right-1.5 top-1.5 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-dark"
      >
        Search
      </button>
    </form>
  );
}
