import { useState } from "react";
import { Bookmark, BookmarkCheck, Star, Eye } from "lucide-react";
import GenreBadge from "../GenreBadge";

function titleToGradient(title = "") {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash) + title.charCodeAt(i);
    hash |= 0;
  }
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 60) % 360;
  return `linear-gradient(155deg, hsl(${hue1},45%,18%) 0%, hsl(${hue2},35%,10%) 100%)`;
}

export default function MovieCard({
  movie,
  onAddToWatchlist,
  onViewDetails,
  isInWatchlist = false,
}) {
  const [imgError, setImgError] = useState(false);
  if (!movie) return null;

  const { id, title = "Untitled", posterUrl, genres = [], rating = 0, releaseYear } = movie;
  const ratingDisplay  = rating > 0 ? Number(rating).toFixed(1) : null;
  const visibleGenres  = genres.slice(0, 2);
  const hasPoster      = posterUrl && !imgError;

  return (
    <article
      className="group/card flex flex-col rounded-xl overflow-hidden border border-white/[0.07] bg-[#13131a] hover:border-white/[0.15] transition-all duration-200 hover:shadow-[0_8px_36px_rgba(0,0,0,0.55)] flex-shrink-0"
      style={{ width: 185 }}
    >
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "2/3" }}>
        {hasPoster ? (
          <img
            src={posterUrl}
            alt={title}
            onError={() => setImgError(true)}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-[1.04]"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center select-none"
            style={{ background: titleToGradient(title) }}
          >
            <span className="text-[5rem] font-black text-white/[0.08] leading-none tracking-tighter">
              {title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {ratingDisplay && (
          <div className="absolute top-2 left-2 flex items-center gap-[3px] rounded-md bg-black/65 backdrop-blur-sm px-1.5 py-[3px]">
            <Star size={9} strokeWidth={0} fill="#fbbf24" className="text-[#fbbf24]" />
            <span className="text-[0.68rem] font-bold text-[#fbbf24] leading-none">
              {ratingDisplay}
            </span>
          </div>
        )}

        {releaseYear && (
          <div className="absolute top-2 right-2 rounded-md bg-black/65 backdrop-blur-sm px-1.5 py-[3px]">
            <span className="text-[0.65rem] font-semibold text-white/65 leading-none">
              {releaseYear}
            </span>
          </div>
        )}

        <div className="absolute inset-0 flex items-end pb-3 px-3 bg-gradient-to-t from-black/75 via-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
          <button
            type="button"
            onClick={() => onViewDetails?.(id)}
            className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-[#8b5cf6]/90 px-3 py-1.5 text-[0.74rem] font-bold text-white hover:bg-[#a78bfa] transition-colors"
          >
            <Eye size={13} strokeWidth={2} />
            View Details
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3 flex-1">
        {/* Title */}
        <h3 className="text-[0.84rem] font-bold text-[#eeeef5] leading-[1.3] line-clamp-2 min-h-[2.2rem]">
          {title}
        </h3>

        {visibleGenres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {visibleGenres.map((g) => (
              <GenreBadge key={g} genre={g} size="xs" />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => onAddToWatchlist?.(id)}
          className={`mt-auto flex items-center justify-center gap-1.5 w-full rounded-lg border px-3 py-[7px] text-[0.72rem] font-semibold transition-all duration-150 ${
            isInWatchlist
              ? "border-[#8b5cf6]/45 bg-[#8b5cf6]/12 text-[#a78bfa]"
              : "border-white/[0.09] bg-[#1a1a24] text-[#6b6b8a] hover:border-[#8b5cf6]/40 hover:bg-[#8b5cf6]/10 hover:text-[#a78bfa]"
          }`}
        >
          {isInWatchlist ? (
            <BookmarkCheck size={12} strokeWidth={2.5} />
          ) : (
            <Bookmark size={12} strokeWidth={2} />
          )}
          {isInWatchlist ? "Saved" : "+ Watchlist"}
        </button>
      </div>
    </article>
  );
}
