"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signUp, type AuthResult } from "@/app/actions/auth";
import SubmitButton from "@/components/SubmitButton";
import AuthLayout from "@/components/AuthLayout";

const initialState: AuthResult = { error: null };

export default function SignupPage() {
  const [state, formAction] = useActionState(signUp, initialState);
  // Controlled so a rejected submission (e.g. "Passwords don't match")
  // doesn't wipe what the user already typed — React resets uncontrolled
  // fields after every form action runs, success or failure.
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const termsRef = useRef<HTMLInputElement>(null);

  // React's own form-reset-after-action doesn't reliably respect a
  // checkbox's `checked` prop the way it does `value` on text inputs, so
  // re-assert it imperatively after every action result comes back.
  useEffect(() => {
    if (termsRef.current) termsRef.current.checked = termsAccepted;
  }, [state, termsAccepted]);

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Join your campus marketplace
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Sign up with your official college email — personal email providers
        like Gmail or Yahoo aren&rsquo;t accepted.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 hover:border-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            College email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@your-college.ac.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 hover:border-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600"
          />
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            >
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            <span>
              We only use this to verify you&rsquo;re a real student here &mdash; we never access your inbox, and you&rsquo;ll set a separate password for CampusBin below.
            </span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 hover:border-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Confirm
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 hover:border-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600"
            />
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">At least 8 characters.</p>

        <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
          <input
            ref={termsRef}
            type="checkbox"
            name="termsAccepted"
            required
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand focus:ring-brand dark:border-slate-700"
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" target="_blank" className="font-semibold text-brand hover:text-brand-dark">
              Terms &amp; Conditions
            </Link>
            ,{" "}
            <Link href="/safety" target="_blank" className="font-semibold text-brand hover:text-brand-dark">
              Community Guidelines
            </Link>
            , and{" "}
            <Link href="/privacy" target="_blank" className="font-semibold text-brand hover:text-brand-dark">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        {state?.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {state.error}
          </p>
        )}

        <SubmitButton>Create account</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand hover:text-brand-dark">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
