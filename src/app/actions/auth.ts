"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type AuthResult = { error: string } | { error: null };

// Keep this in sync with the blocklist in the handle_new_user() database
// trigger — checking here first gives a friendly error message instead of
// the generic "Database error saving new user" Supabase Auth returns when
// the trigger itself rejects the insert.
const BLOCKED_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "protonmail.com",
  "aol.com",
  "live.com",
];

// Supabase Auth errors surface verbatim otherwise, and "email rate limit
// exceeded" means nothing to a student halfway through signing up — it reads
// as though they did something wrong, when the project simply ran out of
// confirmation emails for the hour.
function friendlyAuthError(message: string): string {
  // Supabase reports these both as prose ("email rate limit exceeded") and as
  // codes ("over_email_send_rate_limit"), so flatten separators before
  // matching rather than listing every spelling.
  const m = message.toLowerCase().replace(/[_-]+/g, " ");

  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many signups at once — we can only send a few confirmation emails at a time. Wait a couple of minutes and try again; your details are fine.";
  }
  // Anything that stops the confirmation email leaving: the daily sending
  // quota being spent, or the mail provider being unreachable. Checked before
  // the generic "email" branch below, which would otherwise swallow it and
  // wrongly tell the student their address is malformed.
  if (m.includes("error sending") || m.includes("sending confirmation") || m.includes("smtp")) {
    return "We couldn't send your confirmation email just now — that's our problem, not your details. Your account is saved. This is usually a temporary hiccup (try again in a few minutes), but if we've hit our daily email limit it won't clear until tomorrow — message us if it still isn't working after that.";
  }
  // The per-user cooldown between emails (60s by default). Supabase phrases
  // this as "For security purposes, you can only request this after N
  // seconds", which sounds like an accusation rather than a wait.
  if (m.includes("for security purposes") || m.includes("only request this after")) {
    return "Just a moment — you can request another email in about a minute.";
  }
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "That email already has an account. Try logging in instead.";
  }
  if (m.includes("invalid login credentials")) {
    return "Email or password doesn't match. Check both, or reset your password.";
  }
  if (m.includes("email not confirmed")) {
    return "Check your inbox and click the confirmation link before logging in.";
  }
  if (m.includes("invalid") && m.includes("email")) {
    return "That doesn't look like a valid email address — check for typos in the part after the @.";
  }
  if (m.includes("password")) {
    return "That password isn't accepted. Use at least 8 characters.";
  }
  return message;
}

export async function signUp(
  _prevState: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const termsAccepted = formData.get("termsAccepted") === "on";

  if (!email || !password || !fullName) {
    return { error: "Please fill in every field." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords don't match." };
  }
  if (!termsAccepted) {
    return { error: "Please accept the Terms & Conditions to continue." };
  }
  const domain = email.split("@")[1];
  if (!domain || BLOCKED_EMAIL_DOMAINS.includes(domain)) {
    return {
      error:
        "Please sign up with your official college email address, not a personal email provider like Gmail or Yahoo.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  redirect("/verify-email");
}

export async function signIn(
  _prevState: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Please fill in every field." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  redirect("/browse");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export type PasswordResetResult = { error: string | null; success?: boolean };

export async function requestPasswordReset(
  _prevState: PasswordResetResult | null,
  formData: FormData
): Promise<PasswordResetResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    return { error: "Please enter your email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
  });

  // Supabase itself doesn't error when the email has no account (by design,
  // so this can't be used to check who's registered) — a real error here
  // means something like rate limiting, worth surfacing.
  if (error) {
    return { error: friendlyAuthError(error.message) };
  }
  return { error: null, success: true };
}

export async function updatePassword(
  _prevState: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords don't match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your password reset link has expired. Please request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  // A password reset is often prompted by a compromised account — if someone
  // else has been using the old password on another device, changing it
  // should actually kick them out, not just block future logins. Only other
  // sessions are signed out so the user isn't logged out of the device
  // they're resetting from.
  await supabase.auth.signOut({ scope: "others" });

  redirect("/browse");
}
