export default function OwnerLoading() {
  return (
    <div className="flex-1 flex flex-col p-4 sm:p-5 space-y-5 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-1.5">
            <div className="h-4 w-28 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-40 rounded-lg bg-slate-200 dark:bg-slate-800/60" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-9 h-9 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="w-9 h-9 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      {/* 4 Stats Cards Skeleton */}
      <div className="grid grid-cols-2 gap-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-3.5 space-y-2"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-14 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="h-6 w-12 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="h-2 w-20 rounded bg-slate-200 dark:bg-slate-800/50" />
          </div>
        ))}
      </div>

      {/* Shortcuts Skeleton */}
      <div className="grid grid-cols-2 gap-2">
        <div className="h-14 rounded-2xl bg-slate-200/80 dark:bg-slate-800/60" />
        <div className="h-14 rounded-2xl bg-slate-200/80 dark:bg-slate-800/60" />
      </div>

      {/* Venues Section Skeleton */}
      <div className="space-y-2.5">
        <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800" />
      </div>

      {/* Bookings Section Skeleton */}
      <div className="space-y-2.5">
        <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-32 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800" />
      </div>
    </div>
  );
}
