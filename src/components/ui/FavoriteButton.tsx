"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Heart3D } from "@/components/ui/Icons3D";
import { toggleFavoriteAction } from "@/lib/favorites/actions";

interface FavoriteButtonProps {
  venueId: string;
  initialFavorited?: boolean;
  className?: string;
}

export function FavoriteButton({
  venueId,
  initialFavorited = false,
  className = "",
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;

    // Optimistic update
    const previous = isFavorited;
    setIsFavorited(!previous);
    setIsLoading(true);

    try {
      const res = await toggleFavoriteAction(venueId);
      if (!res.authenticated) {
        setIsFavorited(previous);
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      if (res.success && res.favorited !== undefined) {
        setIsFavorited(res.favorited);
      } else {
        setIsFavorited(previous);
      }
    } catch (err) {
      console.error(err);
      setIsFavorited(previous);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isLoading}
      aria-label={isFavorited ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
      className={`w-9 h-9 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/80 flex items-center justify-center shadow-xs transition-all duration-300 active:scale-85 hover:scale-110 cursor-pointer ${className}`}
    >
      <Heart3D
        className={`w-5 h-5 transition-transform duration-300 ${
          isFavorited ? "scale-110 drop-shadow-[0_2px_8px_rgba(225,29,72,0.4)]" : "opacity-75 hover:opacity-100"
        }`}
        active={isFavorited}
      />
    </button>
  );
}
