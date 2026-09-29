"use client";

// Which icon shows is decided by the `dark` class ThemeInitScript sets before
// first paint, not by React state: state starts as "light" on the server, so
// dark-theme users used to watch the icon spin from moon to sun on every load.
export default function ThemeToggle() {
  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next ? "#020617" : "#ffffff");
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage unavailable — theme just won't persist across visits
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
    >
      <svg
        viewBox="0 0 24 24"
        className="absolute h-5 w-5 -rotate-90 opacity-0 transition-all duration-300 ease-out motion-reduce:transition-none dark:rotate-0 dark:opacity-100"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="4" />
        <path
          strokeLinecap="round"
          d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        />
      </svg>
      <svg
        viewBox="0 0 24 24"
        className="absolute h-5 w-5 rotate-0 opacity-100 transition-all duration-300 ease-out motion-reduce:transition-none dark:rotate-90 dark:opacity-0"
        fill="currentColor"
      >
        <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 1020.354 15.354z" />
      </svg>
    </button>
  );
}
