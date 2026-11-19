export default function OwnerCalendarLoading() {
  return (
    <div className="flex-1 flex flex-col p-4 sm:p-5 space-y-4 animate-pulse">
      {/* Top Bar Skeleton */}
      <div className="flex items-center gap-2 pt-1">
        <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="space-y-1">
          <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-2.5 w-48 rounded bg-slate-200 dark:bg-slate-800/60" />
        </div>
      </div>

      {/* Date Picker Strip Skeleton */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-3 space-y-2">
        <div className="flex justify-between">
          <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="flex gap-2 overflow-x-auto py-1">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-16 w-14 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0" />
          ))}
        </div>
      </div>

      {/* Shifts Skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-4 space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="h-10 rounded-2xl bg-slate-100 dark:bg-slate-800/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
