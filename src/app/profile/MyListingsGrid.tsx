"use client";

import { useState } from "react";
import ListingCard from "@/components/ListingCard";
import SellerQuickActions from "@/components/SellerQuickActions";

type Listing = {
  id: string;
  title: string;
  price: number;
  images: string[];
  status: string;
  condition: string | null;
  created_at: string;
  categories: { name: string } | null;
  removed_reason?: string | null;
};

const TABS = [
  { value: "all", label: "All" },
  { value: "available", label: "Active" },
  { value: "sold", label: "Sold" },
  { value: "removed", label: "Removed" },
] as const;

export default function MyListingsGrid({ listings }: { listings: Listing[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("all");
  const filtered = tab === "all" ? listings : listings.filter((l) => l.status === tab);

  const counts = {
    all: listings.length,
    available: listings.filter((l) => l.status === "available").length,
    sold: listings.filter((l) => l.status === "sold").length,
    removed: listings.filter((l) => l.status === "removed").length,
  };

  // Unlike Active/Sold, most sellers will have zero Removed listings
  // forever — showing that tab unconditionally would be permanent clutter
  // for a case that (hopefully) rarely applies.
  const visibleTabs = TABS.filter((t) => t.value !== "removed" || counts.removed > 0);

  return (
    <div>
      <div className="flex gap-1.5">
        {visibleTabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            aria-current={tab === t.value ? "true" : undefined}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === t.value
                ? "bg-brand text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            {t.label} ({counts[t.value]})
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((listing) => (
            <ListingCard
              key={listing.id}
              id={listing.id}
              title={listing.title}
              price={Number(listing.price)}
              images={listing.images}
              status={listing.status}
              condition={listing.condition}
              createdAt={listing.created_at}
              categoryName={listing.categories?.name}
              removedReason={listing.removed_reason}
              hideSave
              hideInterested
              ownerActions={<SellerQuickActions listingId={listing.id} status={listing.status} />}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {tab === "all"
            ? "You haven't posted anything yet."
            : `No ${tab === "available" ? "active" : tab} listings.`}
        </div>
      )}
    </div>
  );
}
