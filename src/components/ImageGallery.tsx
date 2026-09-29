"use client";

import { useState } from "react";
import Image from "next/image";
import ImageLightbox from "./ImageLightbox";

export default function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
        No photo
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        aria-label="View full-size photo"
        className="group relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800"
      >
        {images.map((img, i) => (
          <Image
            key={i}
            src={img}
            alt={title}
            fill
            sizes="(min-width: 640px) 50vw, 100vw"
            className={`object-cover transition-all duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${
              i === active ? "opacity-100" : "opacity-0"
            }`}
            priority={i === 0}
          />
        ))}
        <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
          </svg>
        </span>
      </button>

      {lightboxOpen && (
        <ImageLightbox
          images={images}
          title={title}
          initialIndex={active}
          onClose={() => setLightboxOpen(false)}
        />
      )}
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View photo ${i + 1} of ${images.length}`}
              aria-current={i === active}
              className={`relative aspect-square overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800 ring-2 transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:scale-100 ${
                i === active
                  ? "scale-105 opacity-100 ring-brand shadow-sm"
                  : "scale-100 opacity-70 ring-transparent hover:opacity-100 hover:ring-slate-300"
              }`}
            >
              <Image src={img} alt="" fill sizes="(min-width: 1024px) 120px, 20vw" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
