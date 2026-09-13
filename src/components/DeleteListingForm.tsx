"use client";

function confirmDelete(e: React.FormEvent<HTMLFormElement>) {
  if (!window.confirm("Delete this listing? This can't be undone — its photos and chat history will be gone.")) {
    e.preventDefault();
  }
}

export default function DeleteListingForm({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action} onSubmit={confirmDelete}>
      <button
        type="submit"
        className="w-full rounded-md border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        Delete listing
      </button>
    </form>
  );
}
