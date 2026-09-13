import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TrendAreaChart, Sparkline, HBarChart, VBarChart, DonutChart, SERIES_COLORS } from "./charts";
import ExpensesSection, { type Expense } from "./ExpensesSection";

export const metadata = { title: "Dashboard — Admin — CampusBin" };
export const dynamic = "force-dynamic";

type SeriesPoint = { bucket: string; n: number };
type CollegeRow = {
  id: string;
  name: string;
  users: number;
  listings: number;
  messages: number;
  active_in_range: number;
  sell_through_pct: number;
};
type CategoryPoint = { name: string; listings: number };
type NamedCount = { name: string; n: number };
type Seller = { name: string; listings: number; views: number };
type HourPoint = { hour: number; n: number };
type WeekdayPoint = { dow: number; n: number };
type PriceBucket = { label: string; sort: number; n: number };
type TopListing = { id: string; title: string; view_count: number; status: string };

type Overview = {
  scope: {
    is_superadmin: boolean;
    college_id: string | null;
    college_name: string | null;
    granularity: "day" | "week" | "month" | "year";
    range_start: string;
    range_end: string;
  };
  colleges: CollegeRow[] | null;
  kpis: {
    users_total: number;
    users_in_range: number;
    users_prev_range: number;
    listings_total: number;
    listings_in_range: number;
    listings_prev_range: number;
    listings_available: number;
    listings_sold: number;
    listings_expired: number;
    messages_total: number;
    messages_in_range: number;
    messages_prev_range: number;
    conversations_total: number;
    active_in_range: number;
    total_views: number;
    median_price: number;
    sellers: number;
    messagers: number;
    active_24h: number;
    active_7d: number;
    never_returned: number;
    sell_through_pct: number;
    reports_open: number;
  };
  series: { signups: SeriesPoint[]; listings: SeriesPoint[]; messages: SeriesPoint[] };
  by_category: CategoryPoint[];
  by_weekday: WeekdayPoint[];
  by_hour: HourPoint[];
  price_buckets: PriceBucket[];
  book_departments: NamedCount[];
  top_sellers: Seller[];
  top_listings: TopListing[];
  generated_at: string;
};

const GRANULARITIES = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
] as const;

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// 1 GB of Supabase storage is the ceiling on the free plan, and photos are
// what fills it. Listing photos compress to roughly 300 KB at 1600px/q0.82.
const EST_KB_PER_IMAGE = 300;
const STORAGE_LIMIT_MB = 1024;

type SearchParams = Promise<{ granularity?: string; college?: string }>;

export default async function AdminDashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const { granularity: granularityRaw, college: collegeRaw } = await searchParams;
  const granularity = (["day", "week", "month", "year"].includes(granularityRaw ?? "")
    ? granularityRaw
    : "day") as "day" | "week" | "month" | "year";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, is_superadmin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin && !profile?.is_superadmin) notFound();

  const collegeParam = profile.is_superadmin ? (collegeRaw || null) : null;

  const { data, error } = await supabase.rpc("admin_dashboard_overview", {
    p_college_id: collegeParam ?? undefined,
    p_granularity: granularity,
  });
  const stats = data as unknown as Overview | null;

  // Business running costs -- entirely separate from marketplace data and
  // gated by RLS to is_superadmin specifically (see the platform_expenses
  // policies), so a future college admin never sees this even by mistake.
  const expenses = profile.is_superadmin
    ? (
        await supabase
          .from("platform_expenses")
          .select("id, description, category, amount, currency, incurred_on, is_recurring, recurring_interval, notes")
          .order("incurred_on", { ascending: false })
      ).data ?? []
    : [];

  if (error || !stats) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <div className="mt-6 rounded-xl border border-dashed border-rose-300 bg-rose-50/60 p-6 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          Couldn&rsquo;t load stats{error?.message ? `: ${error.message}` : "."}
        </div>
      </div>
    );
  }

  const { kpis, scope } = stats;

  function buildUrl(overrides: { granularity?: string; college?: string | null }) {
    const params = new URLSearchParams();
    const g = overrides.granularity ?? granularity;
    const c = overrides.college !== undefined ? overrides.college : collegeParam;
    if (g && g !== "day") params.set("granularity", g);
    if (c) params.set("college", c);
    const qs = params.toString();
    return `/admin${qs ? `?${qs}` : ""}`;
  }

  const rangeLabel = RANGE_LABEL[scope.granularity];

  const statusDonut = [
    { name: "Available", value: kpis.listings_available, color: SERIES_COLORS.available },
    { name: "Sold", value: kpis.listings_sold, color: SERIES_COLORS.sold },
    { name: "Expired", value: kpis.listings_expired, color: SERIES_COLORS.expired },
  ].filter((d) => d.value > 0);

  const alerts = [
    kpis.reports_open > 0 && {
      label: "Open reports",
      value: kpis.reports_open,
      why: "Waiting on moderation.",
    },
  ].filter(Boolean) as { label: string; value: number; why: string }[];

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {scope.college_name ?? "Every college"} · as of {stats.generated_at}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {profile.is_superadmin && (
            <Link
              href="/admin/team"
              className="rounded-full bg-slate-100 px-3.5 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              Manage admins
            </Link>
          )}
          <Link
            href="/admin/reports"
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              kpis.reports_open > 0
                ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-300"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {kpis.reports_open > 0 ? `${kpis.reports_open} open report${kpis.reports_open === 1 ? "" : "s"}` : "Reports"}
          </Link>
        </div>
      </div>

      {/* Filter bar — Power BI's "slicers": pick a grain, pick a scope,
          everything below redraws from the URL, no client state needed. */}
      <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/70 p-2 shadow-sm backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-900/60">
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {GRANULARITIES.map((g) => (
            <Link
              key={g.value}
              href={buildUrl({ granularity: g.value })}
              aria-current={granularity === g.value ? "true" : undefined}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                granularity === g.value
                  ? "bg-white text-brand shadow-sm dark:bg-slate-950 dark:text-brand"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {g.label}
            </Link>
          ))}
        </div>

        {profile.is_superadmin && stats.colleges && (
          <div className="flex flex-wrap items-center gap-1">
            <Link
              href={buildUrl({ college: null })}
              aria-current={!collegeParam ? "true" : undefined}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                !collegeParam
                  ? "border-brand bg-brand-light text-brand-dark dark:border-brand dark:bg-brand/15 dark:text-brand"
                  : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
              }`}
            >
              All colleges
            </Link>
            {stats.colleges.map((c) => (
              <Link
                key={c.id}
                href={buildUrl({ college: c.id })}
                aria-current={collegeParam === c.id ? "true" : undefined}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  collegeParam === c.id
                    ? "border-brand bg-brand-light text-brand-dark dark:border-brand dark:bg-brand/15 dark:text-brand"
                    : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
                }`}
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}
        {profile.is_superadmin && !stats.colleges && (
          <Link
            href={buildUrl({ college: null })}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
          >
            ← All colleges
          </Link>
        )}
      </div>

      <Section title="Activation" hint="Signing up is not using it — these are the numbers that matter early.">
        <div className="space-y-4">
          <FunnelRow label="Signed up" value={kpis.users_total} total={kpis.users_total} caption="100%" />
          <FunnelRow
            label="Listed something"
            value={kpis.sellers}
            total={kpis.users_total}
            caption={`${pct(kpis.sellers, kpis.users_total)}% of students`}
          />
          <FunnelRow
            label="Sent a message"
            value={kpis.messagers}
            total={kpis.users_total}
            caption={`${pct(kpis.messagers, kpis.users_total)}% of students`}
          />
        </div>
      </Section>

      {alerts.length > 0 && (
        <Section title="Needs attention">
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li
                key={a.label}
                className="flex items-start gap-3 rounded-lg border border-amber-200/70 bg-amber-50/60 px-3 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/20"
              >
                <span className="mt-0.5 text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400">{a.value}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{a.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{a.why}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* KPI row — headline totals plus a period-over-period delta and a
          sparkline, the Power BI card-with-trend pattern. */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Students"
          value={kpis.users_total}
          current={kpis.users_in_range}
          previous={kpis.users_prev_range}
          rangeLabel={rangeLabel}
          series={stats.series.signups}
          color={SERIES_COLORS.signups}
        />
        <KpiCard
          label="Listings"
          value={kpis.listings_total}
          current={kpis.listings_in_range}
          previous={kpis.listings_prev_range}
          rangeLabel={rangeLabel}
          series={stats.series.listings}
          color={SERIES_COLORS.listings}
        />
        <KpiCard
          label="Messages"
          value={kpis.messages_total}
          current={kpis.messages_in_range}
          previous={kpis.messages_prev_range}
          rangeLabel={rangeLabel}
          series={stats.series.messages}
          color={SERIES_COLORS.messages}
        />
        <StatTile label="Active this period" value={kpis.active_in_range} sub={`of ${kpis.users_total} students`} />
      </div>

      <Section title="Retention" hint="Coming back is the only real vote of confidence.">
        <div className="grid grid-cols-3 gap-3">
          <Compact label="Active today" value={kpis.active_24h} sub={`of ${kpis.users_total}`} />
          <Compact label="Active this week" value={kpis.active_7d} sub={`of ${kpis.users_total}`} />
          <Compact
            label="Never came back"
            value={kpis.never_returned}
            sub="signed up, never returned"
            tone={kpis.never_returned > 0 ? "warn" : "plain"}
          />
        </div>
      </Section>

      {/* Trend section — the three headline metrics over the selected
          grain, real charts with tooltips rather than div-bars. */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Signups" subtitle={rangeLabel}>
          <TrendAreaChart points={stats.series.signups} granularity={scope.granularity} color={SERIES_COLORS.signups} />
        </Panel>
        <Panel title="New listings" subtitle={rangeLabel}>
          <TrendAreaChart points={stats.series.listings} granularity={scope.granularity} color={SERIES_COLORS.listings} />
        </Panel>
        <Panel title="Messages sent" subtitle={rangeLabel}>
          <TrendAreaChart points={stats.series.messages} granularity={scope.granularity} color={SERIES_COLORS.messages} />
        </Panel>
      </div>

      {/* College comparison — only when a superadmin is looking at every
          college at once. The actual "collegewise segregation" ask. */}
      {stats.colleges && (
        <Section title="By college" hint="How each campus compares, side by side.">
          <div className="grid gap-6 lg:grid-cols-2">
            <HBarChart
              data={stats.colleges.map((c) => ({ label: c.name, value: c.users }))}
              height={Math.max(100, stats.colleges.length * 40)}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200/70 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800/70 dark:text-slate-500">
                    <th className="py-2 pr-3">College</th>
                    <th className="py-2 pr-3 text-right">Users</th>
                    <th className="py-2 pr-3 text-right">Listings</th>
                    <th className="py-2 pr-3 text-right">Messages</th>
                    <th className="py-2 text-right">Sell-through</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stats.colleges.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 pr-3 font-medium text-slate-800 dark:text-slate-200">{c.name}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-slate-600 dark:text-slate-400">{c.users}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-slate-600 dark:text-slate-400">{c.listings}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-slate-600 dark:text-slate-400">{c.messages}</td>
                      <td className="py-2 text-right tabular-nums text-slate-600 dark:text-slate-400">{c.sell_through_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Section>
      )}

      <Section title="Marketplace health" hint="Is the market actually clearing, or just accumulating?">
        <div className="grid gap-6 sm:grid-cols-2">
          <dl className="space-y-2 text-sm">
            <MiniStat label="Sell-through" value={`${kpis.sell_through_pct}%`} />
            <MiniStat label="Total views" value={kpis.total_views.toLocaleString("en-IN")} />
            <MiniStat label="Median price" value={`₹${Math.round(kpis.median_price).toLocaleString("en-IN")}`} />
            <MiniStat label="Active sellers" value={String(kpis.sellers)} />
          </dl>
          {statusDonut.length > 0 ? (
            <DonutChart data={statusDonut} />
          ) : (
            <Empty>No listings yet.</Empty>
          )}
        </div>
      </Section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="By category" subtitle="Where the listings actually are">
          {stats.by_category.length > 0 ? (
            <HBarChart data={stats.by_category.map((c) => ({ label: c.name, value: c.listings }))} />
          ) : (
            <Empty>No listings yet.</Empty>
          )}
        </Panel>

        <Panel title="Price spread" subtitle="Where the campus actually trades">
          <HBarChart data={stats.price_buckets.map((b) => ({ label: b.label, value: b.n }))} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="By day of week" subtitle="When messages actually get sent">
          <VBarChart data={stats.by_weekday.map((w) => ({ label: WEEKDAY_LABELS[w.dow], value: w.n }))} />
        </Panel>

        <Panel title="Books by department" subtitle="Whether the field is being used">
          {stats.book_departments.length > 0 ? (
            <HBarChart data={stats.book_departments.map((d) => ({ label: d.name, value: d.n }))} />
          ) : (
            <Empty>No book listings yet.</Empty>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Top sellers" subtitle="Who is carrying the supply side">
          {stats.top_sellers.length > 0 ? (
            <ol className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.top_sellers.map((s, i) => (
                <li key={`${s.name}-${i}`} className="flex items-center gap-3 py-2">
                  <span className="w-4 shrink-0 text-right text-xs tabular-nums text-slate-400">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-800 dark:text-slate-200">{s.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">{s.views} views</span>
                  <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {s.listings}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <Empty>No sellers yet.</Empty>
          )}
        </Panel>

        <Panel title="When the campus is online" subtitle="Message activity by hour (IST)">
          <HourHeatmap points={stats.by_hour} />
        </Panel>
      </div>

      <Section title="Capacity" hint="Supabase free plan gives 1 GB of file storage — photos are what fill it.">
        <StorageGauge listingsTotal={kpis.listings_total} />
      </Section>

      <Section title="Most viewed">
        {stats.top_listings.length > 0 ? (
          <ol className="divide-y divide-slate-100 dark:divide-slate-800">
            {stats.top_listings.map((l, i) => (
              <li key={l.id} className="flex items-center gap-3 py-2.5">
                <span className="w-5 shrink-0 text-right text-xs tabular-nums text-slate-400 dark:text-slate-500">{i + 1}</span>
                <Link href={`/listings/${l.id}`} className="min-w-0 flex-1 truncate text-sm text-slate-800 hover:text-brand dark:text-slate-200">
                  {l.title}
                </Link>
                {l.status !== "available" && (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {l.status}
                  </span>
                )}
                <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">{l.view_count}</span>
                <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">views</span>
              </li>
            ))}
          </ol>
        ) : (
          <Empty>No views recorded yet.</Empty>
        )}
      </Section>

      {profile.is_superadmin && (
        <Section title="Expenditure" hint="What this project actually costs to run — visible only to you.">
          <ExpensesSection initialExpenses={expenses as Expense[]} />
        </Section>
      )}
    </div>
  );
}

const RANGE_LABEL: Record<Overview["scope"]["granularity"], string> = {
  day: "Last 30 days",
  week: "Last 12 weeks",
  month: "Last 12 months",
  year: "Last 5 years",
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 rounded-2xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-900/60">
      <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h2>
      {hint && <p className="mt-0.5 mb-4 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      <div className={hint ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-900/60">
      <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h2>
      {subtitle && <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      {children}
    </section>
  );
}

function pct(part: number, whole: number) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

function FunnelRow({
  label,
  value,
  total,
  caption,
}: {
  label: string;
  value: number;
  total: number;
  caption: string;
}) {
  const width = total ? Math.max((value / total) * 100, value > 0 ? 3 : 0) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
          {value} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">· {caption}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-brand" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function Compact({
  label,
  value,
  sub,
  tone = "plain",
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: "plain" | "warn";
}) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white/60 p-3 dark:border-slate-800/70 dark:bg-slate-900/40">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className={`mt-0.5 text-xl font-bold tabular-nums ${
          tone === "warn" && value > 0
            ? "text-amber-600 dark:text-amber-400"
            : "text-slate-900 dark:text-slate-100"
        }`}
      >
        {value.toLocaleString("en-IN")}
      </p>
      {sub && <p className="text-[11px] text-slate-400 dark:text-slate-500">{sub}</p>}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-900/60">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{value.toLocaleString("en-IN")}</p>
      {sub && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  );
}

function KpiCard({
  label,
  value,
  current,
  previous,
  rangeLabel,
  series,
  color,
}: {
  label: string;
  value: number;
  current: number;
  previous: number;
  rangeLabel: string;
  series: SeriesPoint[];
  color: string;
}) {
  const delta = previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;
  const up = current >= previous;
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-900/60">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{value.toLocaleString("en-IN")}</p>
      <div className="mt-1 flex items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
            up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          }`}
        >
          <svg viewBox="0 0 12 12" className={`h-3 w-3 ${up ? "" : "rotate-180"}`} fill="currentColor">
            <path d="M6 2l4 5H2z" />
          </svg>
          {Math.abs(delta)}%
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {current} {rangeLabel.toLowerCase()}
        </span>
      </div>
      <div className="mt-2 -mx-1">
        <Sparkline points={series} color={color} />
      </div>
    </div>
  );
}

function HourHeatmap({ points }: { points: HourPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.n));
  const busiest = points.reduce((a, b) => (b.n > a.n ? b : a), points[0]);
  return (
    <div>
      <div className="grid grid-cols-12 gap-1 sm:grid-cols-24">
        {points.map((p) => {
          const intensity = p.n / max;
          return (
            <div
              key={p.hour}
              title={`${formatHour(p.hour)} — ${p.n} message${p.n === 1 ? "" : "s"}`}
              className="aspect-square rounded-sm"
              style={{
                backgroundColor: intensity > 0 ? `rgba(79, 70, 229, ${Math.max(intensity, 0.12)})` : undefined,
              }}
              data-empty={intensity === 0 ? "true" : undefined}
            />
          );
        })}
      </div>
      <style>{`[data-empty="true"] { background-color: rgba(148,163,184,0.15); }`}</style>
      <div className="mt-1.5 flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
        <span>12 am</span>
        <span>12 pm</span>
        <span>11 pm</span>
      </div>
      {busiest && busiest.n > 0 && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Busiest around <span className="font-semibold">{formatHour(busiest.hour)}</span> — a good slot for announcements.
        </p>
      )}
    </div>
  );
}

function formatHour(hour: number) {
  const suffix = hour < 12 ? "am" : "pm";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${suffix}`;
}

function StorageGauge({ listingsTotal }: { listingsTotal: number }) {
  // Estimate from total listings rather than a stats field we didn't carry
  // over — good enough for a capacity glance, not a billing figure.
  const estImages = listingsTotal * 2;
  const storageMb = (estImages * EST_KB_PER_IMAGE) / 1024;
  const storagePct = Math.min(100, (storageMb / STORAGE_LIMIT_MB) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          ~{storageMb.toFixed(0)} MB of {STORAGE_LIMIT_MB} MB
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">estimated from listing counts</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full ${storagePct > 80 ? "bg-rose-500" : storagePct > 50 ? "bg-amber-500" : "bg-emerald-500"}`}
          style={{ width: `${Math.max(storagePct, 1)}%` }}
        />
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-300 py-8 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
      {children}
    </p>
  );
}
