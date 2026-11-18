export default function MyBookingsLoading() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-4 py-6 pb-24 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
        <div className="space-y-1.5">
          <div className="h-6 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-3.5 w-36 bg-slate-200 dark:bg-slate-800 rounded-md" />
        </div>
        <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>

      {/* Booking cards skeleton */}
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded-md" />
            </div>
            <div className="h-10 w-full bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
