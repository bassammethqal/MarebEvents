export default function VenueDetailsLoading() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 animate-pulse">
      {/* Top Header Skeleton */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
        <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-full" />
        <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded-md" />
        <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-full" />
      </div>

      {/* Hero Image Skeleton */}
      <div className="h-64 w-full bg-slate-200 dark:bg-slate-800" />

      {/* Details Skeleton */}
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-md" />
        </div>

        {/* Pricing & Units Skeleton */}
        <div className="h-28 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-4" />

        {/* Booking Form Card Skeleton */}
        <div className="h-64 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-4" />
      </div>
    </div>
  );
}
