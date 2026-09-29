"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { storagePathsFromUrls } from "@/lib/storage";
import { checkImageSafety } from "@/lib/moderation/imageSafety";

export type ProfileResult = { error: string } | { error: null };

export async function updateProfile(
  _prevState: ProfileResult | null,
  formData: FormData
): Promise<ProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const fullName = String(formData.get("fullName") ?? "").trim().slice(0, 100);
  const hostelOrBranch = String(formData.get("hostelOrBranch") ?? "").trim().slice(0, 100);

  if (!fullName) {
    return { error: "Name can't be empty." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, hostel_or_branch: hostelOrBranch || null })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/browse");
  return { error: null };
}

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export async function updateAvatar(
  _prevState: ProfileResult | null,
  formData: FormData
): Promise<ProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a photo." };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { error: "Photo must be under 2MB." };
  }

  // Checked before the old picture is cleared out below, so a refused photo
  // leaves the current one in place.
  const safety = await checkImageSafety(Buffer.from(await file.arrayBuffer()), "avatar");
  if (safety.blocked) {
    return { error: safety.reason };
  }

  // Clear out any previous avatar file(s) first — upsert only overwrites an
  // exact path match, so switching file extensions between uploads (e.g.
  // png -> jpg) would otherwise leave the old one orphaned in storage.
  const { data: existing } = await supabase.storage.from("avatars").list(user.id);
  if (existing && existing.length > 0) {
    await supabase.storage.from("avatars").remove(existing.map((f) => `${user.id}/${f.name}`));
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${user.id}/avatar.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });
  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
  // Cache-bust with a version query param — the path (and therefore the
  // browser/CDN cache key) stays identical across re-uploads otherwise.
  const avatarUrl = `${publicUrl.publicUrl}?v=${Date.now()}`;

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/browse");
  return { error: null };
}

export async function removeAvatar(): Promise<ProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: existing } = await supabase.storage.from("avatars").list(user.id);
  if (existing && existing.length > 0) {
    await supabase.storage.from("avatars").remove(existing.map((f) => `${user.id}/${f.name}`));
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/browse");
  return { error: null };
}

export type ExportedData = {
  exportedAt: string;
  profile: {
    fullName: string | null;
    hostelOrBranch: string | null;
    email: string | undefined;
    accountCreatedAt: string | undefined;
  };
  listings: Array<{
    title: string;
    description: string | null;
    price: number;
    condition: string | null;
    status: string;
    createdAt: string;
  }>;
  savedListings: Array<{ title: string | undefined; savedAt: string }>;
  conversations: Array<{
    withWhom: string | null;
    aboutListing: string | undefined;
    messages: Array<{ sentByMe: boolean; content: string; sentAt: string }>;
  }>;
};

export async function exportMyData(): Promise<
  { error: string; data: null } | { error: null; data: ExportedData }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in.", data: null };
  }

  const [profileRes, listingsRes, savedRes, conversationsRes] = await Promise.all([
    supabase.from("profiles").select("full_name, hostel_or_branch, created_at").eq("id", user.id).single(),
    supabase
      .from("listings")
      .select("title, description, price, condition, status, created_at")
      .eq("seller_id", user.id),
    supabase
      .from("saved_listings")
      .select("created_at, listings(title)")
      .eq("user_id", user.id),
    supabase
      .from("conversations")
      .select(
        "listing:listings(title), buyer:profiles!conversations_buyer_id_fkey(id, full_name), seller:profiles!conversations_seller_id_fkey(id, full_name), messages(content, sender_id, created_at)"
      )
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
  ]);

  const data: ExportedData = {
    exportedAt: new Date().toISOString(),
    profile: {
      fullName: profileRes.data?.full_name ?? null,
      hostelOrBranch: profileRes.data?.hostel_or_branch ?? null,
      email: user.email,
      accountCreatedAt: profileRes.data?.created_at,
    },
    listings: (listingsRes.data ?? []).map((l) => ({
      title: l.title,
      description: l.description,
      price: Number(l.price),
      condition: l.condition,
      status: l.status,
      createdAt: l.created_at,
    })),
    savedListings: (savedRes.data ?? []).map((s) => ({
      title: s.listings?.title,
      savedAt: s.created_at,
    })),
    conversations: (conversationsRes.data ?? []).map((c) => {
      const otherPerson = c.buyer?.id === user.id ? c.seller : c.buyer;
      return {
        withWhom: otherPerson?.full_name ?? null,
        aboutListing: c.listing?.title,
        messages: (c.messages ?? []).map((m) => ({
          sentByMe: m.sender_id === user.id,
          content: m.content,
          sentAt: m.created_at,
        })),
      };
    }),
  };

  return { error: null, data };
}

export async function deleteAccount(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  // Storage objects aren't foreign-keyed to the listings they belong to, so
  // the cascade delete on auth.users -> profiles -> listings never touches
  // them — clean them up first, while the account (and its RLS access)
  // still exists, or they'd be orphaned in the bucket forever.
  const { data: listings } = await supabase
    .from("listings")
    .select("images")
    .eq("seller_id", user.id);
  const paths = storagePathsFromUrls((listings ?? []).flatMap((l) => l.images ?? []));
  if (paths.length > 0) {
    await supabase.storage.from("listing-images").remove(paths);
  }

  const { data: avatarFiles } = await supabase.storage.from("avatars").list(user.id);
  if (avatarFiles && avatarFiles.length > 0) {
    await supabase.storage.from("avatars").remove(avatarFiles.map((f) => `${user.id}/${f.name}`));
  }

  const { error } = await supabase.rpc("delete_own_account");
  if (error) {
    return { error: "Couldn't delete your account. Please try again." };
  }

  await supabase.auth.signOut();
  redirect("/");
}
