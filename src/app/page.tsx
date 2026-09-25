import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Reveal from "@/components/Reveal";
import HeroSearch from "@/components/HeroSearch";
import HowItWorksStepper from "@/components/HowItWorksStepper";
import CategoryExplorer from "@/components/CategoryExplorer";
import GradientMesh from "@/components/GradientMesh";
import StatCounter from "@/components/StatCounter";
import CategoryMarquee from "@/components/CategoryMarquee";

export default async function HomePage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: categories },
    { data: statsRows },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("categories").select("id, name, slug").order("name"),
    supabase.rpc("get_homepage_stats"),
  ]);
  const stats = statsRows?.[0];

  const exploreHref = user ? "/browse" : "/signup";

  return (
    <div>
      <section className="relative overflow-hidden">
        <GradientMesh />

        {/* The 94vw cap plus px-4 spent 54px of a 375px screen on gutters
            before the headline even started, and py-16 pushed it 166px down.
            Phones drop the cap and trim the top so the value proposition is
            visible on landing; sm+ keeps the original roomier hero. */}
        <div className="relative mx-auto w-full max-w-none px-4 py-10 sm:max-w-[min(94vw,96rem)] sm:py-24">
          <div className="grid items-center gap-10 sm:grid-cols-2">
            <div>
              <span className="inline-block rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark">
                Built for your campus, verified by your college email
              </span>
              <h1 className="display-heading mt-5 text-slate-900 dark:text-slate-100">
                Buy and sell,
                <br />
                <span className="bg-gradient-to-r from-brand via-brand to-accent bg-clip-text text-transparent">
                  campus to campus.
                </span>
              </h1>
              <p className="mt-6 max-w-md text-lg text-slate-600 dark:text-slate-400">
                CampusBin connects you with students on your own campus —
                textbooks, gadgets, cycles, and hostel essentials, traded
                directly with people you can actually trust. Every campus gets
                its own private marketplace, unlocked by your college email.
              </p>

              {!user && <HeroSearch />}

              <div className="mt-6 flex flex-wrap gap-3">
                {user ? (
                  <Link
                    href="/browse"
                    className="rounded-md bg-brand px-6 py-3 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md active:scale-[0.97] active:shadow-sm motion-reduce:active:scale-100"
                  >
                    Go to your marketplace
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/signup"
                      className="rounded-md bg-brand px-6 py-3 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md active:scale-[0.97] active:shadow-sm motion-reduce:active:scale-100"
                    >
                      Join with your college email
                    </Link>
                    <Link
                      href="/login"
                      className="rounded-md border border-slate-300 bg-white dark:bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 active:scale-[0.97] motion-reduce:active:scale-100"
                    >
                      Log in
                    </Link>
                  </>
                )}
              </div>

              {stats && (
                <div className="mt-10 flex gap-8 border-t border-slate-200/70 pt-6 dark:border-slate-800/70">
                  <StatCounter value={stats.active_listings} label="Active listings" />
                  <StatCounter value={stats.students_joined} label="Students joined" />
                </div>
              )}
            </div>

            <Reveal delay={150}>
              <HowItWorksStepper />
            </Reveal>
          </div>
        </div>

        {categories && categories.length > 0 && (
          <div className="relative border-t border-slate-200/70 py-6 dark:border-slate-800/70">
            <CategoryMarquee categories={categories} />
          </div>
        )}
      </section>

      {categories && categories.length > 0 && (
        <section className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto w-full max-w-[min(94vw,96rem)] px-4 py-14">
            <Reveal>
              <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-slate-100">
                What people trade on CampusBin
              </h2>
              <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                Hover a category — every listing inside it comes from your own campus.
              </p>
            </Reveal>
            <Reveal delay={100} className="mt-8">
              <CategoryExplorer categories={categories} href={exploreHref} perCategory={!!user} />
            </Reveal>
          </div>
        </section>
      )}

      <section className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto w-full max-w-[min(94vw,96rem)] px-4 py-14">
          <Reveal>
            <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-slate-100">
              Why students trust CampusBin
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <Reveal delay={0}>
              <div className="h-full rounded-2xl border border-slate-200/70 bg-slate-50/80 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-md dark:border-slate-800/70 dark:bg-slate-800/40 dark:hover:border-brand/25">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Verified college emails only
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Every member signs up with their own institution&rsquo;s
                  email, so you&rsquo;re only ever trading with people from
                  your campus.
                </p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="h-full rounded-2xl border border-slate-200/70 bg-slate-50/80 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-md dark:border-slate-800/70 dark:bg-slate-800/40 dark:hover:border-brand/25">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Chat before you meet
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Message sellers directly in the app to agree on price and a
                  safe, public meetup spot on campus.
                </p>
              </div>
            </Reveal>
            <Reveal delay={200}>
              <div className="h-full rounded-2xl border border-slate-200/70 bg-slate-50/80 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-md dark:border-slate-800/70 dark:bg-slate-800/40 dark:hover:border-brand/25">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  No shipping, no scams
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Everything is exchanged in person, hand to hand — nothing
                  ever ships, and no payment ever passes through the app.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto w-full max-w-[min(94vw,96rem)] px-4 py-12">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <span className="text-lg font-bold text-brand">CampusBin</span>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Empowering students to buy, sell, and trade within their own
                verified campus community.
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Quick Links
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>
                  <Link href="/browse" className="hover:text-brand">Browse listings</Link>
                </li>
                <li>
                  <Link href="/sell" className="hover:text-brand">Sell an item</Link>
                </li>
                <li>
                  <Link href="/signup" className="hover:text-brand">Join your campus</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Support
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>
                  <Link href="/safety" className="hover:text-brand">Safety tips &amp; guidelines</Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-brand">Terms &amp; conditions</Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-brand">Privacy policy</Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-brand">About CampusBin</Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <p>
              CampusBin is an independent student project and is not
              affiliated with, endorsed by, or operated on behalf of any
              college or university. Trade safely: meet in public campus
              locations and never share financial information.
            </p>
            <p className="mt-2">
              © {new Date().getFullYear()} CampusBin. Enjoy using it?{" "}
              <Link href="/about#support" className="font-medium text-brand hover:text-brand-dark">
                Support the project
              </Link>
              .
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
