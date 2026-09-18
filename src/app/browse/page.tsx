import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListingCard from "@/components/ListingCard";
import Reveal from "@/components/Reveal";
import SaveSearchButton from "@/components/SaveSearchButton";
import { categoryIcon } from "@/lib/categoryIcons";
import MobileActionBar from "./MobileActionBar";
import LoadMore from "./LoadMore";
import { getCategoryFields } from "@/lib/categoryFields";

type SearchParams = Promise<
  {
    category?: string;
    q?: string;
    sort?: string;
    price_min?: string;
    price_max?: string;
    condition?: string;
    posted?: string;
    page?: string;
    // Superadmin-only: view a specific college's marketplace, or "all" of
    // them at once. Ignored for everyone else — RLS already scopes them to
    // their own college regardless of what this param says.
    college?: string;
    // Plus whichever key the active category's subcategory field uses
    // (e.g. "department" for Books, "type" for Electronics) — see subField.
  } & Record<string, string | undefined>
>;

const PAGE_SIZE = 48;

// "Load more" is cumulative: ?page=3 renders the first three pages' worth in
// one render, so the URL on its own restores everything the user had scrolled
// through — back from a listing lands them exactly where they left off.
const MAX_PAGES = 40;

// Auto-load the first couple of batches so it feels like infinite scroll,
// then hand control back so the end of the list is always reachable.
const AUTO_LOAD_UNTIL_PAGE = 3;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

const PRICE_PRESETS: { label: string; min: string; max?: string }[] = [
  { label: "Under ₹500", min: "0", max: "500" },
  { label: "₹500–2,000", min: "500", max: "2000" },
  { label: "₹2,000+", min: "2000" },
];

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like-new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
];

const POSTED_OPTIONS = [
  { value: "today", label: "Today", hours: 24 },
  { value: "week", label: "This week", hours: 24 * 7 },
  { value: "month", label: "This month", hours: 24 * 30 },
];

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { category, q } = await searchParams;
  if (q) {
    return { title: `“${q}” — Browse — CampusBin` };
  }
  if (category) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("categories")
      .select("name")
      .eq("slug", category)
      .maybeSingle();
    if (data?.name) {
      return { title: `${data.name} — Browse — CampusBin` };
    }
  }
  return { title: "Browse — CampusBin" };
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const {
    category,
    q,
    sort = "newest",
    price_min,
    price_max,
    condition,
    posted,
    page: pageRaw,
    college: collegeRaw,
  } = resolvedSearchParams;
  // Capped so a hand-edited ?page=99999 can't ask Supabase for a million rows.
  const page = Math.min(MAX_PAGES, Math.max(1, Math.floor(Number(pageRaw)) || 1));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: categories }, { data: blockedRows }, { data: profile }] = await Promise.all([
    supabase.from("categories").select("id, name, slug").order("name"),
    supabase.from("blocked_users").select("blocked_id").eq("blocker_id", user.id),
    supabase.from("profiles").select("is_superadmin, college_id").eq("id", user.id).single(),
  ]);
  const blockedIds = new Set(blockedRows?.map((r) => r.blocked_id));

  // Superadmins can drop into any college's marketplace (or all of them at
  // once) via the switcher in the header — everyone else stays scoped to
  // their own college by RLS ("listings viewable within same college"),
  // same as always. Without an explicit filter here, a superadmin would see
  // every college's listings by default, since the RLS policy that grants
  // them full access is additive to (not a replacement for) the own-college
  // one.
  const isSuperadmin = profile?.is_superadmin ?? false;
  const collegeFilter = isSuperadmin ? (collegeRaw || profile?.college_id || null) : null;

  let query = supabase
    .from("listings")
    .select(
      "id, title, price, images, status, condition, created_at, seller_id, categories(name, slug)",
      { count: "exact" }
    )
    .eq("status", "available");
  if (collegeFilter && collegeFilter !== "all") {
    query = query.eq("college_id", collegeFilter);
  }
  if (blockedIds.size > 0) {
    query = query.not("seller_id", "in", `(${Array.from(blockedIds).join(",")})`);
  }

  const activeCategory = categories?.find((c) => c.slug === category);
  if (activeCategory) {
    query = query.eq("category_id", activeCategory.id);
  }
  if (q) {
    query = query.ilike("title", `%${q}%`);
  }
  if (price_min) {
    query = query.gte("price", Number(price_min));
  }
  if (price_max) {
    query = query.lte("price", Number(price_max));
  }
  if (condition) {
    query = query.eq("condition", condition);
  }
  // A category can define one "subcategory" field with grouped options
  // (department for Books, type for Electronics, ...). It lives in the
  // listing's custom_fields JSON rather than its own column, so it's
  // queried with PostgREST's ->> operator, keyed by whatever field the
  // active category defines.
  const subField = getCategoryFields(activeCategory?.slug).find((f) => f.optionGroups);
  const subValue = subField ? resolvedSearchParams[subField.key] : undefined;
  const subFilterActive = Boolean(subField) && Boolean(subValue);
  if (subField && subFilterActive) {
    query = query.eq(`custom_fields->>${subField.key}`, subValue!);
  }
  const postedOption = POSTED_OPTIONS.find((p) => p.value === posted);
  if (postedOption) {
    const since = new Date(Date.now() - postedOption.hours * 60 * 60 * 1000);
    query = query.gte("created_at", since.toISOString());
  }

  if (sort === "price_asc") {
    query = query.order("price", { ascending: true });
  } else if (sort === "price_desc") {
    query = query.order("price", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.range(0, page * PAGE_SIZE - 1);

  const [{ data: listings, count: totalCount }, { data: savedRows }] = await Promise.all([
    query,
    supabase.from("saved_listings").select("listing_id").eq("user_id", user.id),
  ]);

  const savedIds = new Set(savedRows?.map((r) => r.listing_id));

  const shown = listings?.length ?? 0;
  const total = totalCount ?? 0;
  const hasMore = shown < total && page < MAX_PAGES;

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      category,
      q,
      sort,
      price_min,
      price_max,
      condition,
      posted,
      ...(isSuperadmin ? { college: collegeFilter ?? undefined } : {}),
      ...(subField ? { [subField.key]: subValue } : {}),
      ...overrides,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    return `/browse${qs ? `?${qs}` : ""}`;
  }

  const hasExtraFilters = condition || posted || subFilterActive;
  const hasAnyFilter = Boolean(
    activeCategory || q || price_min || price_max || condition || posted || subFilterActive
  );
  const mobileFilterCount = [
    Boolean(activeCategory),
    Boolean(condition),
    Boolean(posted),
    subFilterActive,
    Boolean(price_min || price_max),
  ].filter(Boolean).length;

  // Full-bleed with tight padding on phones — the 94vw cap plus px-4 was
  // spending ~54px of a 375px screen on empty gutters.
  return (
    <div className="mx-auto w-full max-w-none px-3 py-3 sm:max-w-[min(94vw,96rem)] sm:px-4 sm:py-6">
      {/* Breadcrumb and the category tile strip wait for lg, which is where
          the sidebar arrives and the action bar's Category sheet steps down.
          Below that the sheet covers the same ground, and these two were
          spending most of the first screen on navigation. */}
      <nav className="mb-4 hidden items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 lg:flex">
        <Link href="/browse" className="hover:text-brand">
          Home
        </Link>
        {activeCategory && (
          <>
            <span>/</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{activeCategory.name}</span>
          </>
        )}
        {q && !activeCategory && (
          <>
            <span>/</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">&ldquo;{q}&rdquo;</span>
          </>
        )}
      </nav>

      {/* Category tile strip — the fade masks hint that the row keeps
          going past either edge, since overflow-x-auto alone gives no
          visual cue there's more to scroll to on a narrow screen. */}
      <div className="mb-6 hidden gap-3 overflow-x-auto pb-2 lg:flex [-webkit-mask-image:linear-gradient(to_right,transparent,black_20px,black_calc(100%-20px),transparent)] [mask-image:linear-gradient(to_right,transparent,black_20px,black_calc(100%-20px),transparent)]">
        <Link
          href={buildUrl({ category: undefined })}
          aria-current={!category ? "true" : undefined}
          className={categoryTileClass(!category)}
        >
          <span
            aria-hidden
            className="text-2xl transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:scale-100"
          >
            🛍️
          </span>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">All</span>
          <span
            aria-hidden
            className={`absolute inset-x-3 bottom-1 h-0.5 origin-center rounded-full bg-brand transition-transform duration-300 ease-out ${
              !category ? "scale-x-100" : "scale-x-0"
            }`}
          />
        </Link>
        {categories?.map((c) => (
          <Link
            key={c.id}
            href={buildUrl({ category: c.slug })}
            aria-current={category === c.slug ? "true" : undefined}
            className={categoryTileClass(category === c.slug)}
          >
            <span
              aria-hidden
              className="text-2xl transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:scale-100"
            >
              {categoryIcon(c.slug)}
            </span>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{c.name}</span>
            <span
              aria-hidden
              className={`absolute inset-x-3 bottom-1 h-0.5 origin-center rounded-full bg-brand transition-transform duration-300 ease-out ${
                category === c.slug ? "scale-x-100" : "scale-x-0"
              }`}
            />
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* The sidebar costs 232px including its gap. At sm that was 37% of
            a 700px screen, squeezing the three-column grid down to ~120px
            cards. It now waits for lg — the same line the header nav and
            bottom nav switch on — and everything narrower uses the action
            bar's sheets, which cover the identical filters. */}
        <aside className="hidden space-y-6 lg:block lg:w-52 lg:shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Price range</h2>
            <form className="mt-3 space-y-2">
              {category && <input type="hidden" name="category" value={category} />}
              {q && <input type="hidden" name="q" value={q} />}
              {sort && <input type="hidden" name="sort" value={sort} />}
              {condition && <input type="hidden" name="condition" value={condition} />}
              {posted && <input type="hidden" name="posted" value={posted} />}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  name="price_min"
                  min="0"
                  defaultValue={price_min}
                  placeholder="Min"
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <span className="text-slate-400 dark:text-slate-500">–</span>
                <input
                  type="number"
                  name="price_max"
                  min="0"
                  defaultValue={price_max}
                  placeholder="Max"
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                Apply
              </button>
            </form>
            <Link
              href={buildUrl({ price_min: undefined, price_max: undefined })}
              className="mt-2 inline-block text-xs font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              Clear price filter
            </Link>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRICE_PRESETS.map((preset) => {
                const active = price_min === preset.min && price_max === (preset.max ?? undefined);
                return (
                  <Link
                    key={preset.label}
                    href={buildUrl({ price_min: preset.min, price_max: preset.max })}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "border-brand bg-brand-light text-brand-dark dark:border-brand dark:bg-brand/15 dark:text-brand"
                        : "border-slate-200 text-slate-600 hover:border-brand/40 dark:border-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {preset.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Only categories that define a grouped-option field (Books ->
              department, Electronics -> type, ...) show this filter —
              otherwise it'd be dead UI on every other category. */}
          {subField && (
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {subField.label}
              </h2>
              <div className="mt-3 space-y-1">
                <Link
                  href={buildUrl({ [subField.key]: undefined })}
                  aria-current={!subValue ? "true" : undefined}
                  className={`block rounded-md px-2 py-1 text-xs ${
                    !subValue
                      ? "bg-brand-light font-semibold text-brand-dark dark:bg-brand/15 dark:text-brand"
                      : "text-slate-600 hover:text-brand dark:text-slate-400"
                  }`}
                >
                  All {subField.label.toLowerCase()}s
                </Link>
                {subField.optionGroups!.map((group) => (
                  <div key={group.label} className="pt-1">
                    <p className="px-2 pb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {group.label}
                    </p>
                    {group.options.map((opt) => (
                      <Link
                        key={opt}
                        href={buildUrl({ [subField.key]: subValue === opt ? undefined : opt })}
                        aria-current={subValue === opt ? "true" : undefined}
                        className={`block rounded-md px-2 py-1 text-xs ${
                          subValue === opt
                            ? "bg-brand-light font-semibold text-brand-dark dark:bg-brand/15 dark:text-brand"
                            : "text-slate-600 hover:text-brand dark:text-slate-400"
                        }`}
                      >
                        {opt}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Condition</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {CONDITIONS.map((c) => (
                <Link
                  key={c.value}
                  href={buildUrl({ condition: condition === c.value ? undefined : c.value })}
                  aria-current={condition === c.value ? "true" : undefined}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                    condition === c.value
                      ? "border-brand bg-brand-light text-brand-dark"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                  }`}
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Posted</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {POSTED_OPTIONS.map((p) => (
                <Link
                  key={p.value}
                  href={buildUrl({ posted: posted === p.value ? undefined : p.value })}
                  aria-current={posted === p.value ? "true" : undefined}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                    posted === p.value
                      ? "border-brand bg-brand-light text-brand-dark"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                  }`}
                >
                  {p.label}
                </Link>
              ))}
            </div>
          </div>

          {hasExtraFilters && (
            <Link
              href={buildUrl({ condition: undefined, posted: undefined })}
              className="inline-block text-xs font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              Clear condition/date filters
            </Link>
          )}

          <div className="hidden sm:block">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Category</h2>
            <ul className="mt-3 space-y-1 text-sm">
              <li>
                <Link
                  href={buildUrl({ category: undefined })}
                  aria-current={!category ? "true" : undefined}
                  className={`block rounded-md px-2 py-1.5 ${
                    !category
                      ? "bg-brand-light font-semibold text-brand-dark"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  All Categories
                </Link>
              </li>
              {categories?.map((c) => (
                <li key={c.id}>
                  <Link
                    href={buildUrl({ category: c.slug })}
                    aria-current={category === c.slug ? "true" : undefined}
                    className={`block rounded-md px-2 py-1.5 ${
                      category === c.slug
                        ? "bg-brand-light font-semibold text-brand-dark"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="flex-1">
          {/* Sort / Category / Filters — first thing on the page for
              phones, replacing the breadcrumb and category strip that used
              to sit here. Its three sheets are fed from here so the option
              lists stay server-rendered. */}
          <MobileActionBar
            currentSort={sort}
            activeFilterCount={mobileFilterCount}
            activeCategoryName={activeCategory?.name}
            categoryContent={
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                <li>
                  <Link
                    href={buildUrl({ category: undefined })}
                    className={`flex items-center gap-3 py-3.5 text-sm ${
                      !category
                        ? "font-semibold text-brand"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span aria-hidden className="text-xl">
                      🛍️
                    </span>
                    All categories
                  </Link>
                </li>
                {categories?.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={buildUrl({ category: c.slug })}
                      className={`flex items-center gap-3 py-3.5 text-sm ${
                        category === c.slug
                          ? "font-semibold text-brand"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span aria-hidden className="text-xl">
                        {categoryIcon(c.slug)}
                      </span>
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            }
            filtersContent={
              <form action="/browse" method="get">
                {q && <input type="hidden" name="q" value={q} />}
                {sort && sort !== "newest" && <input type="hidden" name="sort" value={sort} />}

                <FilterGroup label="Price range">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        name="price_min"
                        min="0"
                        inputMode="numeric"
                        defaultValue={price_min}
                        placeholder="Min"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-7 pr-3 text-sm text-slate-900 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </div>
                    <span className="text-slate-300 dark:text-slate-600">–</span>
                    <div className="relative flex-1">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        name="price_max"
                        min="0"
                        inputMode="numeric"
                        defaultValue={price_max}
                        placeholder="Max"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-7 pr-3 text-sm text-slate-900 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </FilterGroup>

                {subField && (
                  <FilterGroup label={subField.label}>
                    <select
                      name={subField.key}
                      defaultValue={subValue ?? ""}
                      className="select-chevron w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-9 text-sm text-slate-900 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    >
                      <option value="">All {subField.label.toLowerCase()}s</option>
                      {subField.optionGroups!.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </FilterGroup>
                )}

                <FilterGroup label="Condition">
                  <div className="grid grid-cols-3 gap-2">
                    <ChoiceChip name="condition" value="" label="Any" checked={!condition} />
                    {CONDITIONS.map((c) => (
                      <ChoiceChip
                        key={c.value}
                        name="condition"
                        value={c.value}
                        label={c.label}
                        checked={condition === c.value}
                      />
                    ))}
                  </div>
                </FilterGroup>

                <FilterGroup label="Posted">
                  <div className="grid grid-cols-2 gap-2">
                    <ChoiceChip name="posted" value="" label="Any time" checked={!posted} />
                    {POSTED_OPTIONS.map((p) => (
                      <ChoiceChip
                        key={p.value}
                        name="posted"
                        value={p.value}
                        label={p.label}
                        checked={posted === p.value}
                      />
                    ))}
                  </div>
                </FilterGroup>

                {/* Category has its own sheet on the action bar, so it's
                    carried through as a hidden field rather than repeated
                    as a second control here. */}
                {category && <input type="hidden" name="category" value={category} />}

                <div className="sticky bottom-0 -mx-5 mt-6 flex gap-3 border-t border-slate-100 bg-white/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
                  {mobileFilterCount > 0 && (
                    <Link
                      href={buildUrl({
                        category: undefined,
                        price_min: undefined,
                        price_max: undefined,
                        condition: undefined,
                        posted: undefined,
                      })}
                      className="flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      Clear all
                    </Link>
                  )}
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand/25 transition-colors hover:bg-brand-dark"
                  >
                    Show results
                  </button>
                </div>
              </form>
            }
          />

          {hasAnyFilter && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {activeCategory && (
                <FilterChip label={activeCategory.name} href={buildUrl({ category: undefined })} />
              )}
              {q && <FilterChip label={`"${q}"`} href={buildUrl({ q: undefined })} />}
              {(price_min || price_max) && (
                <FilterChip
                  label={
                    price_min && price_max
                      ? `₹${price_min}–${price_max}`
                      : price_min
                        ? `₹${price_min}+`
                        : `Up to ₹${price_max}`
                  }
                  href={buildUrl({ price_min: undefined, price_max: undefined })}
                />
              )}
              {condition && (
                <FilterChip
                  label={CONDITIONS.find((c) => c.value === condition)?.label ?? condition}
                  href={buildUrl({ condition: undefined })}
                />
              )}
              {posted && (
                <FilterChip
                  label={POSTED_OPTIONS.find((p) => p.value === posted)?.label ?? posted}
                  href={buildUrl({ posted: undefined })}
                />
              )}
              {subField && subFilterActive && (
                <FilterChip label={subValue!} href={buildUrl({ [subField.key]: undefined })} />
              )}
              <Link
                href="/browse"
                className="ml-1 text-xs font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                Clear all
              </Link>
            </div>
          )}
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3 sm:mb-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              Showing {shown} of {total} result{total === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-3">
              {hasAnyFilter && (
                <SaveSearchButton
                  query={q}
                  categoryId={activeCategory?.id}
                  condition={condition}
                  posted={posted}
                />
              )}
              <div className="hidden items-center gap-2 text-sm lg:flex">
                <label htmlFor="sort" className="text-slate-500 dark:text-slate-400">
                  Sort by
                </label>
                <SortSelect current={sort} buildUrl={buildUrl} />
              </div>
            </div>
          </div>

          {listings && listings.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
              {listings.map((listing, i) => (
                <Reveal key={listing.id} delay={(i % 4) * 60}>
                  <ListingCard
                    id={listing.id}
                    title={listing.title}
                    price={Number(listing.price)}
                    images={listing.images}
                    status={listing.status}
                    categoryName={listing.categories?.name}
                    condition={listing.condition}
                    createdAt={listing.created_at}
                    saved={savedIds.has(listing.id)}
                    sellerId={listing.seller_id}
                    hideInterested={listing.seller_id === user.id}
                    // Two columns on a phone, up to five on a wide desktop —
                    // six covers the first visible row everywhere without
                    // eagerly pulling images nobody has scrolled to.
                    priority={i < 6}
                  />
                </Reveal>
              ))}
            </div>
          ) : null}

          {hasMore && (
            <LoadMore
              href={buildUrl({ page: String(page + 1) })}
              shown={shown}
              total={total}
              nextCount={Math.min(PAGE_SIZE, total - shown)}
              autoLoad={page < AUTO_LOAD_UNTIL_PAGE}
            />
          )}

          {/* Knowing you've reached the end is the thing infinite scroll can
              never tell you — worth saying out loud, but only once the list
              was long enough for the question to come up. */}
          {!hasMore && shown > PAGE_SIZE && (
            <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
              You&rsquo;ve seen all {total} listing{total === 1 ? "" : "s"}.
            </p>
          )}

          {(!listings || listings.length === 0) && (hasAnyFilter ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No listings match your filters.{" "}
              <Link href="/browse" className="font-semibold text-brand">
                Clear all filters
              </Link>{" "}
              or{" "}
              <Link href="/sell" className="font-semibold text-brand">
                sell something
              </Link>
              !
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Nothing here yet — be the first to post{activeCategory ? ` in ${activeCategory.name}` : ""}.{" "}
              <Link href="/sell" className="font-semibold text-brand">
                Sell something
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 py-5 first:pt-1 dark:border-slate-800">
      <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </h3>
      {children}
    </div>
  );
}

// A radio styled as a tappable chip — keeps the whole sheet a plain GET
// form (no client state to sync) while still reading as a modern control
// rather than a stack of native radio buttons.
function ChoiceChip({
  name,
  value,
  label,
  checked,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name={name} value={value} defaultChecked={checked} className="peer sr-only" />
      <span className="block rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-sm font-medium text-slate-600 transition-colors peer-checked:border-brand peer-checked:bg-brand-light peer-checked:font-semibold peer-checked:text-brand-dark peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:peer-checked:border-brand dark:peer-checked:bg-brand/15 dark:peer-checked:text-brand">
        {label}
      </span>
    </label>
  );
}

function categoryTileClass(active: boolean) {
  return `group relative flex shrink-0 flex-col items-center gap-1.5 overflow-hidden rounded-2xl border px-4 py-3 text-center backdrop-blur-sm transition-all duration-300 ease-out ${
    active
      ? "border-brand/40 bg-brand-light/80 shadow-sm shadow-brand/10 dark:border-brand/30 dark:bg-brand/15"
      : "border-slate-200/70 bg-white/70 hover:-translate-y-0.5 hover:border-brand/30 hover:bg-white hover:shadow-md hover:shadow-slate-200/60 dark:border-slate-800/70 dark:bg-slate-900/60 dark:hover:border-brand/25 dark:hover:bg-slate-900/90 dark:hover:shadow-black/30"
  }`;
}

function SortSelect({
  current,
  buildUrl,
}: {
  current: string;
  buildUrl: (overrides: Record<string, string | undefined>) => string;
}) {
  return (
    <div className="flex gap-1">
      {SORT_OPTIONS.map((opt) => (
        <Link
          key={opt.value}
          href={buildUrl({ sort: opt.value })}
          aria-current={current === opt.value ? "true" : undefined}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
            current === opt.value
              ? "bg-brand text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          }`}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}

function FilterChip({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-1 rounded-full bg-brand-light px-2.5 py-1 text-xs font-medium text-brand-dark transition-colors hover:bg-brand/20 dark:bg-brand/15 dark:text-brand"
    >
      {label}
      <svg viewBox="0 0 24 24" className="h-3 w-3 opacity-60 group-hover:opacity-100" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </Link>
  );
}
