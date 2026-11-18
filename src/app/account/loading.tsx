export default function AccountLoading() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-4 py-6 pb-24 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
        <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-5 w-14 bg-slate-200 dark:bg-slate-800 rounded-lg" />
      </div>

      {/* User Card Skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs mb-5">
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </div>
        </div>
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded-md" />
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="h-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4" />
        <div className="h-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4" />
      </div>

      {/* Action links skeleton */}
      <div className="space-y-2">
        <div className="h-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800" />
        <div className="h-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800" />
      </div>
    </div>
  );
}
