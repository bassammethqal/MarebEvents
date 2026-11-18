export default function ExploreLoading() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-4 py-4 pb-24 animate-pulse">
      {/* Top Search & Filter Skeleton */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
        <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>

      <div className="h-11 w-full bg-slate-200 dark:bg-slate-800 rounded-2xl mb-4" />

      {/* Categories chips skeleton */}
      <div className="flex gap-2 overflow-hidden mb-6">
        <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0" />
        <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0" />
        <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0" />
        <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0" />
      </div>

      {/* Cards Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-xs"
          >
            <div className="h-44 w-full bg-slate-200 dark:bg-slate-800" />
            <div className="p-4 space-y-3">
              <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
