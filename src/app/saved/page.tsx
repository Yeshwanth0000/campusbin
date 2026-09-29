import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListingCard from "@/components/ListingCard";
import EmptyState from "@/components/EmptyState";

export const metadata = { title: "Saved items — CampusBin" };

export default async function SavedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: saved } = await supabase
    .from("saved_listings")
    .select(
      "listing_id, listings(id, title, price, images, status, condition, created_at, seller_id, categories(name))"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const listings = saved?.map((s) => s.listings).filter(Boolean) ?? [];

  return (
    <div className="mx-auto w-full max-w-none px-3 py-4 sm:max-w-[min(94vw,96rem)] sm:px-4 sm:py-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Saved items</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Things you&rsquo;ve bookmarked to check out later.</p>
      </div>

      {listings.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
          {listings.map((listing) => (
            <ListingCard
              key={listing!.id}
              id={listing!.id}
              title={listing!.title}
              price={Number(listing!.price)}
              images={listing!.images}
              status={listing!.status}
              condition={listing!.condition}
              createdAt={listing!.created_at}
              categoryName={listing!.categories?.name}
              saved
              sellerId={listing!.seller_id}
              hideInterested={listing!.seller_id === user.id}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21s-6.716-4.35-9.428-8.06C.66 10.42 1.1 6.9 3.9 5.28c2.35-1.36 5.02-.6 6.6 1.32.5.6.9 1.2 1.5 1.2s1-.6 1.5-1.2c1.58-1.92 4.25-2.68 6.6-1.32 2.8 1.62 3.24 5.14 1.33 7.66C18.716 16.65 12 21 12 21z"
              />
            </svg>
          }
          title="Nothing saved yet"
          description="Tap the heart on any listing to bookmark it here for later."
          actionHref="/browse"
          actionLabel="Browse listings"
        />
      )}
    </div>
  );
}
