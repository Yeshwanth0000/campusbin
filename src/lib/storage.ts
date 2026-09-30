// Keeps storage object names to plain characters, so a photo's public URL
// never needs percent-encoding and always matches the object's name exactly.
// The database relies on that when a listing or profile points at a photo.
export function safeFileName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-{2,}/g, "-");
  return cleaned.slice(-80) || "photo.jpg";
}

export function storagePathsFromUrls(urls: string[]): string[] {
  return urls
    .map((url) => url.split("/listing-images/")[1])
    // The stored URL has the path percent-encoded (spaces, parens, etc. from
    // the original filename) — the storage object's real name doesn't, so an
    // undecoded path silently matches nothing and .remove() is a no-op.
    .map((path) => (path ? decodeURIComponent(path) : path))
    .filter((path): path is string => Boolean(path));
}
