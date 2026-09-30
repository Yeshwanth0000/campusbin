"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createListing, type ListingResult } from "@/app/actions/listings";
import SubmitButton from "@/components/SubmitButton";
import { getCategoryFields } from "@/lib/categoryFields";
import { compressImage } from "@/lib/compressImage";

const initialState: ListingResult = { error: null };
const MAX_PHOTOS = 5;
const MAX_PHOTO_DIMENSION = 1600;

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like-new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
];

const STEPS = ["Details", "Photos", "Category", "Review"] as const;

export default function SellForm({
  categories,
  savedPhoneNumber = "",
}: {
  categories: { id: string; name: string; slug: string }[];
  savedPhoneNumber?: string;
}) {
  const [state, formAction] = useActionState(createListing, initialState);
  const [step, setStep] = useState(0);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [condition, setCondition] = useState("good");
  const [categoryId, setCategoryId] = useState("");
  const [meetupSpot, setMeetupSpot] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [phoneNumber, setPhoneNumber] = useState(savedPhoneNumber);
  const [showPhone, setShowPhone] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [trimmedCount, setTrimmedCount] = useState(0);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const customFields = useMemo(() => getCategoryFields(selectedCategory?.slug), [selectedCategory]);

  // Every preview URL made while the form is open, released when it unmounts
  // rather than as photos are swapped out, so a preview on screen can never
  // point at a released URL (an append that's still compressing restores the
  // photos it started with, previews included).
  const previewUrlsToRelease = useRef<string[]>([]);
  useEffect(() => {
    const urls = previewUrlsToRelease.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function makePreviewUrl(file: File) {
    const url = URL.createObjectURL(file);
    previewUrlsToRelease.current.push(url);
    return url;
  }

  function syncInputFiles(files: File[]) {
    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));
    if (fileInputRef.current) fileInputRef.current.files = dataTransfer.files;
  }

  async function addFiles(files: File[], mode: "replace" | "append") {
    const combined = mode === "append" ? [...selectedFiles, ...files] : files;
    const trimmed = combined.slice(0, MAX_PHOTOS);
    setTrimmedCount(combined.length - trimmed.length);

    // Only the newly-added files need compressing — anything from an
    // "append" that was already in selectedFiles has already been through
    // this once.
    const alreadyCompressed = mode === "append" ? selectedFiles : [];
    const toCompress = trimmed.slice(alreadyCompressed.length);
    setIsCompressing(true);
    const compressed = await Promise.all(
      toCompress.map((file) => compressImage(file, { maxDimension: MAX_PHOTO_DIMENSION }))
    );
    setIsCompressing(false);

    const next = [...trimmed.slice(0, alreadyCompressed.length), ...compressed];
    setSelectedFiles(next);
    setPreviewUrls([...previewUrls.slice(0, alreadyCompressed.length), ...compressed.map(makePreviewUrl)]);
    syncInputFiles(next);
  }

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []), "replace");
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDraggingPhoto(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDraggingPhoto(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDraggingPhoto(false);
    const dropped = Array.from(e.dataTransfer.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (dropped.length > 0) addFiles(dropped, "append");
  }

  function removePhoto(index: number) {
    const next = selectedFiles.filter((_, i) => i !== index);
    setTrimmedCount(0);
    setSelectedFiles(next);
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
    syncInputFiles(next);
  }

  const priceNumber = Number(price);
  const stepValid = [
    title.trim().length > 0 && !Number.isNaN(priceNumber) && priceNumber >= 0,
    true,
    categoryId.length > 0,
    true,
  ];

  function goNext() {
    if (!stepValid[step]) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goTo(target: number) {
    if (target > step && !stepValid.slice(0, target).every(Boolean)) return;
    setStep(target);
  }

  return (
    <form action={formAction} className="mt-6">
      <ol className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => goTo(i)}
              className="group flex flex-1 flex-col items-center gap-1.5"
            >
              <span
                className={`h-1.5 w-full rounded-full transition-colors duration-300 ease-out ${
                  i <= step ? "bg-brand" : "bg-slate-200 dark:bg-slate-800"
                }`}
              />
              <span
                className={`text-[11px] font-medium transition-colors duration-300 ${
                  i === step
                    ? "text-brand"
                    : i < step
                      ? "text-slate-600 dark:text-slate-300"
                      : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {label}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-6 overflow-hidden">
        <div
          className="flex transition-transform duration-400 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${step * 100}%)` }}
        >
          {/* Step 1: Details */}
          <div className="w-full shrink-0 space-y-4 px-0.5">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Title
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                maxLength={150}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Engineering Mechanics textbook, 2nd edition"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                maxLength={3000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Price (₹)
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="condition" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Condition
                </label>
                <select
                  id="condition"
                  name="condition"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Step 2: Photos */}
          <div className="w-full shrink-0 px-0.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor="images" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Photos (up to {MAX_PHOTOS})
              </label>
              {isCompressing ? (
                <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent motion-reduce:animate-none" />
                  Optimizing…
                </span>
              ) : (
                selectedFiles.length > 0 && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedFiles.length} of {MAX_PHOTOS} selected
                  </span>
                )
              )}
            </div>
            <input
              ref={fileInputRef}
              id="images"
              name="images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesChange}
              className="mt-1 w-full text-sm text-slate-600 dark:text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-brand-light file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-dark"
            />
            {trimmedCount > 0 && (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                Only the first {MAX_PHOTOS} photos were kept — {trimmedCount} more{" "}
                {trimmedCount === 1 ? "was" : "were"} not added.
              </p>
            )}
            {previewUrls.length > 0 ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`mt-3 grid grid-cols-5 gap-2 rounded-lg p-1 transition-colors ${
                  isDraggingPhoto ? "bg-brand-light/60 dark:bg-brand/10" : ""
                }`}
              >
                {previewUrls.map((url, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Selected photo ${i + 1}`} className="h-full w-full object-cover" />
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      aria-label={`Remove photo ${i + 1}`}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`mt-3 rounded-md border border-dashed py-6 text-center text-xs transition-colors ${
                  isDraggingPhoto
                    ? "border-brand bg-brand-light/60 text-brand-dark dark:bg-brand/10 dark:text-brand"
                    : "border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-400"
                }`}
              >
                {isDraggingPhoto ? "Drop to add" : "Drag photos here, or use the picker above — optional, but recommended."}
              </div>
            )}
          </div>

          {/* Step 3: Category fields */}
          <div className="w-full shrink-0 space-y-4 px-0.5">
            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Category
              </label>
              <select
                id="categoryId"
                name="categoryId"
                required
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setCustomFieldValues({});
                }}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {customFields.length > 0 && (
              <div className="grid grid-cols-2 gap-4 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                {customFields.map((field) => (
                  <div key={field.key}>
                    <label
                      htmlFor={`custom_${field.key}`}
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      {field.label}
                    </label>
                    {field.optionGroups ? (
                      <select
                        id={`custom_${field.key}`}
                        name={`custom_${field.key}`}
                        value={customFieldValues[field.key] ?? ""}
                        onChange={(e) =>
                          setCustomFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        className="select-chevron mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      >
                        <option value="">Not specified</option>
                        {field.optionGroups.map((group) => (
                          <optgroup key={group.label} label={group.label}>
                            {group.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`custom_${field.key}`}
                        name={`custom_${field.key}`}
                        type="text"
                        maxLength={200}
                        placeholder={field.placeholder}
                        value={customFieldValues[field.key] ?? ""}
                        onChange={(e) =>
                          setCustomFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div>
              <label htmlFor="meetupSpot" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Suggested meetup spot
              </label>
              <input
                id="meetupSpot"
                name="meetupSpot"
                type="text"
                maxLength={150}
                value={meetupSpot}
                onChange={(e) => setMeetupSpot(e.target.value)}
                placeholder="e.g. Main gate, Library, Hostel block C"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Phone number <span className="font-normal text-slate-500 dark:text-slate-400">(optional)</span>
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                maxLength={20}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 98765 43210"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <label className="mt-3 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  name="showPhone"
                  checked={showPhone}
                  onChange={(e) => setShowPhone(e.target.checked)}
                  disabled={!phoneNumber.trim()}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand disabled:opacity-50 dark:border-slate-600"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Show my phone number on this listing. Off by default — buyers can always reach
                  you through chat instead.
                </span>
              </label>
            </div>
          </div>

          {/* Step 4: Review */}
          <div className="w-full shrink-0 px-0.5">
            <div className="space-y-3 rounded-lg border border-slate-200/70 bg-white/70 p-4 text-sm shadow-sm backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-900/60">
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">Title</span>
                <span className="text-right font-medium text-slate-900 dark:text-slate-100">
                  {title || "—"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">Price</span>
                <span className="font-semibold text-brand">
                  {priceNumber > 0 ? `₹${priceNumber.toLocaleString("en-IN")}` : "Free"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">Condition</span>
                <span className="font-medium capitalize text-slate-900 dark:text-slate-100">
                  {condition.replace("-", " ")}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">Category</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {selectedCategory?.name ?? "—"}
                </span>
              </div>
              {meetupSpot && (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">Meetup spot</span>
                  <span className="text-right font-medium text-slate-900 dark:text-slate-100">
                    {meetupSpot}
                  </span>
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">Phone number</span>
                <span className="text-right font-medium text-slate-900 dark:text-slate-100">
                  {showPhone && phoneNumber.trim() ? "Visible on this listing" : "Hidden"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">Photos</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {selectedFiles.length} added
                </span>
              </div>
              {previewUrls.length > 0 && (
                <div className="flex gap-2 pt-1">
                  {previewUrls.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt={`Photo ${i + 1}`}
                      className="h-14 w-14 rounded-md object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {state?.error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {state.error}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Back
          </button>
        )}
        <div className="flex-1">
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!stepValid[step]}
              className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
            >
              Continue
            </button>
          ) : (
            <SubmitButton>Post listing</SubmitButton>
          )}
        </div>
      </div>
    </form>
  );
}
