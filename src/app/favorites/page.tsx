import Link from "next/link";
import { Heart, ArrowLeft } from "lucide-react";

export const instant = false;

export default function FavoritesPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 md:py-10">
      <div className="max-w-xl mx-auto mb-6 flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white">القاعات المفضلة</h1>
          <p className="text-xs text-slate-400">قائمة المنشآت التي قمت بحفظها للرجوع إليها لاحقاً</p>
        </div>
        <Link
          href="/"
          className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
        >
          <span>الرئيسية</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="max-w-md mx-auto text-center py-16 px-4">
        <div className="h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4 text-rose-400">
          <Heart className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">قائمتك المفضلة فارغة حالياً</h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          يمكنك الضغط على أيقونة القلب على أي قاعة أو شاليه أثناء تصفحك لإضافتها إلى قائمتك الخاصة والرجوع إليها في أي وقت.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm py-3 px-6 rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-95"
        >
          استكشف قاعات مأرب الآن
        </Link>
      </div>
    </div>
  );
}
