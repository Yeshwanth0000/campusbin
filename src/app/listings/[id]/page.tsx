import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startConversation } from "@/app/actions/chat";
import { markAsSold, deleteListing, relistListing } from "@/app/actions/listings";
import ImageGallery from "@/components/ImageGallery";
import ListingCard from "@/components/ListingCard";
import SaveButton from "@/components/SaveButton";
import SafetyMenu from "@/components/SafetyMenu";
import ViewTracker from "@/components/ViewTracker";
import RelistButton from "@/components/RelistButton";
import DeleteListingForm from "@/components/DeleteListingForm";
import Avatar from "@/components/Avatar";
import { getCategoryFields } from "@/lib/categoryFields";
import { conditionBadgeClasses, conditionLabel } from "@/lib/conditionBadge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  // Listings are scoped to the viewer's own college via RLS, so an
  // unauthenticated request (e.g. a link-preview bot with no session) can
  // never see real listing data here — that's correct for a college-private
  // marketplace, not a bug, so this just falls back to the site defaults
  // rather than trying to work around it. This mainly makes the browser tab
  // title useful for a signed-in viewer with several listings open.
  const { data: listing } = await supabase
    .from("listings")
    .select("title, description")
    .eq("id", id)
    .maybeSingle();

  if (!listing) {
    return { title: "CampusBin — Your Campus Marketplace" };
  }

  return {
    title: `${listing.title} — CampusBin`,
    description: listing.description?.slice(0, 160) || undefined,
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // listing only needs `id` (already in hand) and doesn't need `user`, so it
  // starts alongside getUser() instead of waiting on it. Middleware already
  // redirects unauthenticated visitors before this component ever runs, so
  // the listing fetch is never truly wasted in practice.
  const [
    {
      data: { user },
    },
    { data: listing },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("listings")
      .select(
        "id, title, description, price, condition, images, meetup_spot, status, created_at, seller_id, category_id, view_count, custom_fields, show_phone, categories(name, slug), profiles(full_name, hostel_or_branch, created_at, avatar_url, phone_number)"
      )
      .eq("id", id)
      .single(),
  ]);

  if (!user) redirect("/login");
  if (!listing) notFound();

  const isOwner = listing.seller_id === user.id;

  // None of these five depend on each other's results — only on `user` and
  // `listing`, both already resolved above — so they run concurrently.
  const [
    { data: savedRow },
    { count: sellerListingsCount },
    { data: saveCount },
    { data: blockedRows },
    { data: relatedListingsRaw },
  ] = await Promise.all([
    supabase
      .from("saved_listings")
      .select("id")
      .eq("user_id", user.id)
      .eq("listing_id", id)
      .maybeSingle(),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", listing.seller_id)
      .eq("status", "available"),
    isOwner
      ? supabase.rpc("get_listing_save_count", { p_listing_id: id })
      : Promise.resolve({ data: null }),
    supabase.from("blocked_users").select("blocked_id").eq("blocker_id", user.id),
    listing.category_id
      ? supabase
          .from("listings")
          .select("id, title, price, images, status, condition, created_at, seller_id, categories(name)")
          .eq("category_id", listing.category_id)
          .eq("status", "available")
          .neq("id", id)
          .limit(8)
      : Promise.resolve({ data: null }),
  ]);
  const blockedIds = new Set(blockedRows?.map((r) => r.blocked_id));
  const blockedRow = blockedIds.has(listing.seller_id);

  const relatedListings = relatedListingsRaw
    ?.filter((r) => !blockedIds.has(r.seller_id))
    .slice(0, 4);

  const { data: relatedSavedRows } =
    relatedListings && relatedListings.length > 0
      ? await supabase
          .from("saved_listings")
          .select("listing_id")
          .eq("user_id", user.id)
          .in(
            "listing_id",
            relatedListings.map((r) => r.id)
          )
      : { data: null };
  const relatedSavedIds = new Set(relatedSavedRows?.map((r) => r.listing_id));

  async function messageSeller() {
    "use server";
    await startConversation(listing!.id, listing!.seller_id);
  }

  async function handleMarkAsSold() {
    "use server";
    await markAsSold(id);
  }

  async function handleDelete() {
    "use server";
    await deleteListing(id);
    redirect("/profile");
  }

  return (
    <div className="mx-auto w-full max-w-none px-3 py-3 sm:max-w-[min(94vw,96rem)] sm:px-4 sm:py-6">
      <ViewTracker listingId={id} />
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/browse" className="hover:text-brand">
          Home
        </Link>
        {listing.categories?.slug && (
          <>
            <span>/</span>
            <Link
              href={`/browse?category=${listing.categories.slug}`}
              className="hover:text-brand"
            >
              {listing.categories.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="truncate font-medium text-slate-700 dark:text-slate-300">{listing.title}</span>
      </nav>

      {/* Mobile stacks these three blocks in a single column, ordered by
          `order` so the price/action card sits right after the image
          (a buyer shouldn't have to scroll past the description and seller
          card just to see the price or reply) — the same card is reused as
          the sticky lg+ sidebar via explicit grid placement, instead of
          duplicating title/price/the primary action in a separate block.
          The image column used to be a 3fr share of the page's own
          96rem max-width, so on a wide monitor a plain aspect-square photo
          rendered 900px+ tall — capping it to a fixed 34rem keeps photos a
          reasonable size and lets the price/action column use the space
          that opens up instead of sitting mostly empty beside a giant photo. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,34rem)_1fr]">
        <div className="lg:col-start-1 lg:row-start-1">
          <ImageGallery images={listing.images} title={listing.title} />
        </div>

        <div className="order-3 space-y-4 lg:order-none lg:col-start-1 lg:row-start-2">
          {listing.description && (
            <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
              {listing.description}
            </p>
          )}

          {(() => {
            const fieldDefs = getCategoryFields(listing.categories?.slug);
            const customFields = (listing.custom_fields ?? {}) as Record<string, string>;
            const entries = fieldDefs
              .map((def) => ({ label: def.label, value: customFields[def.key] }))
              .filter((entry) => entry.value);
            if (entries.length === 0) return null;
            return (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                {entries.map((entry) => (
                  <div key={entry.label}>
                    <dt className="text-xs text-slate-500 dark:text-slate-400">{entry.label}</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">{entry.value}</dd>
                  </div>
                ))}
              </dl>
            );
          })()}

          {listing.meetup_spot && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold">Suggested meetup:</span>{" "}
              {listing.meetup_spot}
            </p>
          )}

          <Link
            href={`/sellers/${listing.seller_id}`}
            className="flex h-fit items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm transition hover:border-brand hover:bg-brand-light/40 dark:border-slate-800"
          >
            <Avatar avatarUrl={listing.profiles?.avatar_url} name={listing.profiles?.full_name ?? "S"} size={40} />
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {listing.profiles?.full_name ?? "Student"}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                {listing.profiles?.hostel_or_branch
                  ? `${listing.profiles.hostel_or_branch} · `
                  : ""}
                {sellerListingsCount ?? 0} listing
                {sellerListingsCount === 1 ? "" : "s"}
              </p>
            </div>
          </Link>
        </div>

        <div className="order-2 lg:order-none lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <div className="lg:sticky lg:top-24 rounded-2xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-900/60">
            {listing.status === "sold" && (
              <span className="mb-2 inline-block rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white dark:bg-slate-700">
                Sold
              </span>
            )}
            {listing.status === "expired" && (
              <span className="mb-2 inline-block rounded-full bg-slate-500 px-3 py-1 text-xs font-semibold text-white dark:bg-slate-600">
                Expired — no longer shown in Browse
              </span>
            )}
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-balance text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                {listing.title}
              </h1>
              {!isOwner && (
                <div className="flex shrink-0 items-center gap-1">
                  <SaveButton listingId={id} initialSaved={!!savedRow} />
                  <SafetyMenu
                    userId={listing.seller_id}
                    listingId={id}
                    initialBlocked={blockedRow}
                  />
                </div>
              )}
            </div>
            <p className="mt-2 text-3xl font-bold text-brand">
              {Number(listing.price) > 0
                ? `₹${Number(listing.price).toLocaleString("en-IN")}`
                : "Free"}
            </p>

            {isOwner && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {listing.view_count === 0
                  ? "No views yet"
                  : `${listing.view_count} view${listing.view_count === 1 ? "" : "s"}`}
                {saveCount != null && saveCount > 0 && (
                  <> · {saveCount} save{saveCount === 1 ? "" : "s"}</>
                )}{" "}
                · only you can see this
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {listing.categories?.name && (
                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {listing.categories.name}
                </span>
              )}
              {listing.condition && (
                <span
                  className={`rounded-full px-3 py-1 font-medium capitalize ${conditionBadgeClasses(listing.condition)}`}
                >
                  {conditionLabel(listing.condition)}
                </span>
              )}
            </div>

            <div className="mt-6 space-y-2">
              {isOwner ? (
                <>
                  {listing.status === "available" && (
                    <>
                      <Link
                        href={`/listings/${id}/edit`}
                        className="block w-full rounded-md border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Edit listing
                      </Link>
                      <form action={handleMarkAsSold}>
                        <button
                          type="submit"
                          className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
                        >
                          Mark as sold
                        </button>
                      </form>
                    </>
                  )}
                  {(listing.status === "sold" || listing.status === "expired") && (
                    <RelistButton listingId={id} />
                  )}
                  <DeleteListingForm action={handleDelete} />
                </>
              ) : (
                listing.status === "available" &&
                (blockedRow ? (
                  <p className="rounded-md border border-slate-200 px-4 py-2.5 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    You've blocked this seller — unblock them to send a message.
                  </p>
                ) : (
                  <form action={messageSeller}>
                    <button
                      type="submit"
                      className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md"
                    >
                      I&rsquo;m interested
                    </button>
                  </form>
                ))
              )}
              {!isOwner && !blockedRow && listing.show_phone && listing.profiles?.phone_number && (
                <a
                  href={`tel:${listing.profiles.phone_number}`}
                  className="block w-full rounded-md border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Call {listing.profiles.phone_number}
                </a>
              )}
              <Link
                href="/browse"
                className="block text-center text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                ← Back to browsing
              </Link>
            </div>
          </div>
        </div>
      </div>

      {relatedListings && relatedListings.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">More in this category</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {relatedListings.map((r) => (
              <ListingCard
                key={r.id}
                id={r.id}
                title={r.title}
                price={Number(r.price)}
                images={r.images}
                status={r.status}
                condition={r.condition}
                createdAt={r.created_at}
                categoryName={r.categories?.name}
                saved={relatedSavedIds.has(r.id)}
                sellerId={r.seller_id}
                hideInterested={r.seller_id === user.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
