import Skeleton from "@/components/Skeleton";

const BUBBLE_WIDTHS = ["w-40", "w-56", "w-32", "w-48", "w-24"];

export default function ChatThreadLoading() {
  return (
    <div className="mx-auto flex h-[calc(100dvh-63px)] w-full max-w-none animate-skeleton-in flex-col px-3 py-3 sm:h-[calc(100dvh-126px)] sm:max-w-[min(94vw,72rem)] sm:px-4 sm:py-4 lg:h-[calc(100dvh-64px)]">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      <div className="mt-3 flex-1 space-y-3 overflow-hidden sm:mt-4 sm:rounded-2xl sm:border sm:border-slate-200/70 sm:bg-white/70 sm:p-4 dark:sm:border-slate-800/70 dark:sm:bg-slate-900/60">
        {BUBBLE_WIDTHS.map((width, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
            <Skeleton className={`h-9 ${width} rounded-2xl`} />
          </div>
        ))}
      </div>

      <Skeleton className="mt-3 h-12 w-full shrink-0 rounded-xl" />
    </div>
  );
}
