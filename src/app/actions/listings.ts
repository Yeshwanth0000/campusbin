"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CATEGORY_CUSTOM_FIELDS } from "@/lib/categoryFields";
import { storagePathsFromUrls } from "@/lib/storage";
import { checkImageSafety } from "@/lib/moderation/imageSafety";
import { MAX_ACTIVE_LISTINGS } from "@/lib/listingLimits";

const CUSTOM_FIELD_MAX_LENGTH = 200;
const TITLE_MAX_LENGTH = 150;
const DESCRIPTION_MAX_LENGTH = 3000;
const MEETUP_SPOT_MAX_LENGTH = 150;
const PHONE_MAX_LENGTH = 20;
// Loose on purpose — just enough to reject obvious garbage, not to enforce
// a specific country format (students may list a non-Indian number).
const PHONE_PATTERN = /^[0-9+()\- ]{7,20}$/;

async function activeListingLimitError(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sellerId: string
): Promise<string | null> {
  const { count } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", sellerId)
    .eq("status", "available");

  if ((count ?? 0) >= MAX_ACTIVE_LISTINGS) {
    return `You've reached the limit of ${MAX_ACTIVE_LISTINGS} active listings. Mark one as sold or delete it before posting another.`;
  }
  return null;
}

function extractCustomFields(formData: FormData, categorySlug: string | null | undefined) {
  const defs = categorySlug ? CATEGORY_CUSTOM_FIELDS[categorySlug] ?? [] : [];
  const result: Record<string, string> = {};
  for (const def of defs) {
    const value = String(formData.get(`custom_${def.key}`) ?? "")
      .trim()
      .slice(0, CUSTOM_FIELD_MAX_LENGTH);
    if (value) result[def.key] = value;
  }
  return result;
}

function extractPhone(formData: FormData): { phoneNumber: string | null; showPhone: boolean } {
  const phoneNumber = String(formData.get("phoneNumber") ?? "").trim().slice(0, PHONE_MAX_LENGTH);
  const showPhone = formData.get("showPhone") === "on" && PHONE_PATTERN.test(phoneNumber);
  return { phoneNumber: phoneNumber || null, showPhone };
}

export type ListingResult = { error: string } | { error: null };

export async function createListing(
  _prevState: ListingResult | null,
  formData: FormData
): Promise<ListingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const title = String(formData.get("title") ?? "").trim().slice(0, TITLE_MAX_LENGTH);
  const description = String(formData.get("description") ?? "").trim().slice(0, DESCRIPTION_MAX_LENGTH);
  const priceRaw = String(formData.get("price") ?? "0");
  const price = Number(priceRaw);
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const condition = String(formData.get("condition") ?? "") || null;
  const meetupSpot = String(formData.get("meetupSpot") ?? "").trim().slice(0, MEETUP_SPOT_MAX_LENGTH) || null;
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const { phoneNumber, showPhone } = extractPhone(formData);

  if (!title || Number.isNaN(price) || price < 0) {
    return { error: "Please provide a title and a valid price." };
  }
  if (files.length > 5) {
    return { error: "You can upload at most 5 photos." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("college_id")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return { error: "Your profile could not be found." };
  }

  const limitError = await activeListingLimitError(supabase, user.id);
  if (limitError) {
    return { error: limitError };
  }

  if (phoneNumber) {
    await supabase.from("profiles").update({ phone_number: phoneNumber }).eq("id", user.id);
  }

  let categorySlug: string | null = null;
  if (categoryId) {
    const { data: category } = await supabase
      .from("categories")
      .select("slug")
      .eq("id", categoryId)
      .maybeSingle();
    categorySlug = category?.slug ?? null;
  }
  const customFields = extractCustomFields(formData, categorySlug);

  // Read and safety-check every photo before uploading any of them, so a
  // blocked photo never leaves a partial set of images sitting in storage.
  const fileBuffers: Buffer[] = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const safety = await checkImageSafety(buffer);
    if (safety.blocked) {
      return { error: safety.reason };
    }
    fileBuffers.push(buffer);
  }

  const imageUrls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(path, fileBuffers[i], { contentType: file.type || "image/jpeg" });
    if (uploadError) {
      return { error: `Photo upload failed: ${uploadError.message}` };
    }
    const { data: publicUrl } = supabase.storage
      .from("listing-images")
      .getPublicUrl(path);
    imageUrls.push(publicUrl.publicUrl);
  }

  const { data: listing, error } = await supabase
    .from("listings")
    .insert({
      seller_id: user.id,
      college_id: profile.college_id,
      title,
      description,
      price,
      category_id: categoryId,
      condition,
      meetup_spot: meetupSpot,
      images: imageUrls,
      custom_fields: customFields,
      show_phone: showPhone,
    })
    .select("id")
    .single();

  if (error || !listing) {
    return { error: error?.message ?? "Could not create listing." };
  }

  redirect(`/listings/${listing.id}`);
}

export async function updateListing(
  _prevState: ListingResult | null,
  formData: FormData
): Promise<ListingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const listingId = String(formData.get("listingId") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, TITLE_MAX_LENGTH);
  const description = String(formData.get("description") ?? "").trim().slice(0, DESCRIPTION_MAX_LENGTH);
  const priceRaw = String(formData.get("price") ?? "0");
  const price = Number(priceRaw);
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const condition = String(formData.get("condition") ?? "") || null;
  const meetupSpot = String(formData.get("meetupSpot") ?? "").trim().slice(0, MEETUP_SPOT_MAX_LENGTH) || null;
  const keptImages = formData.getAll("keptImages").map(String);
  const newFiles = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);
  const { phoneNumber, showPhone } = extractPhone(formData);

  if (!listingId || !title || Number.isNaN(price) || price < 0) {
    return { error: "Please provide a title and a valid price." };
  }
  if (keptImages.length + newFiles.length > 5) {
    return { error: "You can have at most 5 photos total." };
  }

  if (phoneNumber) {
    await supabase.from("profiles").update({ phone_number: phoneNumber }).eq("id", user.id);
  }

  const { data: original } = await supabase
    .from("listings")
    .select("images")
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .single();
  const droppedImages = (original?.images ?? []).filter(
    (url: string) => !keptImages.includes(url)
  );

  let categorySlug: string | null = null;
  if (categoryId) {
    const { data: category } = await supabase
      .from("categories")
      .select("slug")
      .eq("id", categoryId)
      .maybeSingle();
    categorySlug = category?.slug ?? null;
  }
  const customFields = extractCustomFields(formData, categorySlug);

  // Same pre-check as createListing: verify every new photo before
  // uploading any of them.
  const newFileBuffers: Buffer[] = [];
  for (const file of newFiles) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const safety = await checkImageSafety(buffer);
    if (safety.blocked) {
      return { error: safety.reason };
    }
    newFileBuffers.push(buffer);
  }

  const imageUrls: string[] = [...keptImages];
  for (let i = 0; i < newFiles.length; i++) {
    const file = newFiles[i];
    const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(path, newFileBuffers[i], { contentType: file.type || "image/jpeg" });
    if (uploadError) {
      return { error: `Photo upload failed: ${uploadError.message}` };
    }
    const { data: publicUrl } = supabase.storage
      .from("listing-images")
      .getPublicUrl(path);
    imageUrls.push(publicUrl.publicUrl);
  }

  const { error } = await supabase
    .from("listings")
    .update({
      title,
      description,
      price,
      category_id: categoryId,
      condition,
      meetup_spot: meetupSpot,
      images: imageUrls,
      custom_fields: customFields,
      show_phone: showPhone,
    })
    .eq("id", listingId)
    .eq("seller_id", user.id);

  if (error) {
    return { error: error.message };
  }

  const droppedPaths = storagePathsFromUrls(droppedImages);
  if (droppedPaths.length > 0) {
    await supabase.storage.from("listing-images").remove(droppedPaths);
  }

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/profile");
  revalidatePath("/browse");
  redirect(`/listings/${listingId}`);
}

export async function relistListing(listingId: string): Promise<ListingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: original } = await supabase
    .from("listings")
    .select(
      "title, description, price, category_id, condition, meetup_spot, images, seller_id, college_id, custom_fields, status"
    )
    .eq("id", listingId)
    .single();

  if (!original) {
    return { error: "Original listing not found." };
  }
  if (original.seller_id !== user.id) {
    return { error: "You can only relist your own listings." };
  }
  // The menu only offers "Relist" for sold/expired listings, but that's just
  // UI — without this check, calling the action directly on a listing an
  // admin removed for being spam would silently recreate it verbatim.
  if (original.status !== "sold" && original.status !== "expired") {
    return { error: "This listing can't be relisted." };
  }

  const limitError = await activeListingLimitError(supabase, user.id);
  if (limitError) {
    return { error: limitError };
  }

  const { data: created, error } = await supabase
    .from("listings")
    .insert({
      seller_id: original.seller_id,
      college_id: original.college_id,
      title: original.title,
      description: original.description,
      price: original.price,
      category_id: original.category_id,
      condition: original.condition,
      meetup_spot: original.meetup_spot,
      images: original.images,
      custom_fields: original.custom_fields,
    })
    .select("id")
    .single();

  if (error || !created) {
    return {
      error:
        error?.message ??
        "Could not relist right now. If you've posted several listings recently, please wait a bit before trying again.",
    };
  }

  revalidatePath("/profile");
  revalidatePath("/browse");
  redirect(`/listings/${created.id}`);
}

export async function markAsSold(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("listings")
    .update({ status: "sold" })
    .eq("id", listingId)
    .eq("seller_id", user.id);

  revalidatePath("/profile");
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/browse");
}

export async function deleteListing(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: listing } = await supabase
    .from("listings")
    .select("images")
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .single();

  await supabase
    .from("listings")
    .delete()
    .eq("id", listingId)
    .eq("seller_id", user.id);

  const paths = storagePathsFromUrls(listing?.images ?? []);
  if (paths.length > 0) {
    await supabase.storage.from("listing-images").remove(paths);
  }

  revalidatePath("/profile");
  revalidatePath("/browse");
}

export type QuickSearchResult = {
  id: string;
  title: string;
  price: number;
  image: string | null;
};

export async function quickSearchListings(query: string): Promise<QuickSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("listings")
    .select("id, title, price, images")
    .eq("status", "available")
    .ilike("title", `%${trimmed}%`)
    .order("created_at", { ascending: false })
    .limit(5);

  return (data ?? []).map((l) => ({
    id: l.id,
    title: l.title,
    price: Number(l.price),
    image: l.images?.[0] ?? null,
  }));
}
