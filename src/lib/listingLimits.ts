// Keeps one person from flooding the marketplace with junk listings —
// generous enough that no genuine seller should ever hit it, since a
// student clearing out a dorm room might reasonably list this many at once.
// The database enforces the same number (private.enforce_active_listing_cap,
// migration 20260929130000), so change both together.
export const MAX_ACTIVE_LISTINGS = 10;
