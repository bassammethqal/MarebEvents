"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Heart } from "lucide-react";
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
      className={`w-8 h-8 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex items-center justify-center shadow-sm transition active:scale-90 hover:scale-105 ${
        isFavorited
          ? "text-rose-500 fill-rose-500"
          : "text-slate-400 hover:text-rose-500"
      } ${className}`}
    >
      <Heart
        className={`w-4 h-4 transition duration-200 ${
          isFavorited ? "fill-rose-500 text-rose-500" : "fill-transparent"
        }`}
      />
    </button>
  );
}
