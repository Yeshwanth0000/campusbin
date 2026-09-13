"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { updateAvatar, removeAvatar } from "@/app/actions/profile";
import { compressImage } from "@/lib/compressImage";
import { toast } from "@/lib/toast";

const MAX_AVATAR_DIMENSION = 640;

export default function AvatarUpload({
  avatarUrl,
  fallbackLetter,
}: {
  avatarUrl: string | null;
  fallbackLetter: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Once the server's avatarUrl actually changes (revalidatePath after a
  // successful upload re-rendering this component with the real value),
  // drop the local blob preview and let the persisted URL take over —
  // otherwise previewUrl would stay set for the rest of the page's life,
  // permanently hiding the Remove control below.
  useEffect(() => {
    setPreviewUrl(null);
  }, [avatarUrl]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));

    startTransition(async () => {
      const compressed = await compressImage(file, { maxDimension: MAX_AVATAR_DIMENSION });
      const formData = new FormData();
      formData.set("avatar", compressed);
      const result = await updateAvatar(null, formData);
      if (result.error) {
        toast(result.error, "error");
        setPreviewUrl(null);
      } else {
        toast("Profile photo updated.");
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeAvatar();
      if (result.error) {
        toast(result.error, "error");
      } else {
        setPreviewUrl(null);
        toast("Profile photo removed.");
      }
    });
  }

  const displayUrl = previewUrl ?? avatarUrl;

  return (
    <div className="group relative -mt-10 flex h-20 w-20 shrink-0 sm:-mt-12 sm:h-24 sm:w-24">
      <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-white bg-brand-light shadow-sm dark:border-slate-900">
        {displayUrl ? (
          <Image src={displayUrl} alt="" fill sizes="96px" className="object-cover" unoptimized={!!previewUrl} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-brand-dark">
            {fallbackLetter}
          </div>
        )}
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent motion-reduce:animate-none" />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        aria-label={avatarUrl ? "Change profile photo" : "Add profile photo"}
        className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white opacity-100 transition-opacity hover:bg-slate-800 disabled:pointer-events-none dark:border-slate-900 dark:bg-slate-700 sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {avatarUrl && !previewUrl && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={isPending}
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full whitespace-nowrap pt-1 text-[11px] font-medium text-slate-400 opacity-100 transition-opacity hover:text-red-500 disabled:pointer-events-none sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
        >
          Remove
        </button>
      )}
    </div>
  );
}
