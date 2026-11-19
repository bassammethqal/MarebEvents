export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 animate-pulse">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Top Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-slate-800" />
            <div className="h-8 w-60 rounded-xl bg-slate-800" />
            <div className="h-3 w-80 rounded bg-slate-800/60" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 rounded-xl bg-slate-800" />
            <div className="h-9 w-24 rounded-xl bg-slate-800" />
          </div>
        </div>

        {/* 4 Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5"
            >
              <div className="h-11 w-11 rounded-xl bg-slate-800" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-20 rounded bg-slate-800" />
                <div className="h-6 w-12 rounded bg-slate-800" />
              </div>
            </div>
          ))}
        </div>

        {/* Form Skeleton */}
        <div className="h-48 rounded-3xl bg-slate-900 border border-slate-800" />

        {/* Table Skeleton */}
        <div className="h-64 rounded-3xl bg-slate-900 border border-slate-800" />
      </div>
    </div>
  );
}
