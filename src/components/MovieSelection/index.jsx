import { Film } from "lucide-react";
import MovieCarousel from "../MovieCarousel";

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-white/[0.07] bg-[#13131a] py-10">
      <Film size={30} strokeWidth={1.2} className="text-[#2e2e42]" />
      <p className="text-[0.82rem] text-[#3d3d52] max-w-xs text-center">{message}</p>
    </div>
  );
}

export default function MovieSection({
  title,
  subtitle,
  icon: Icon = Film,
  iconColor = "#8b5cf6",
  movies = [],
  loading = false,
  emptyMessage = "No movies to show yet.",
  onAddToWatchlist,
  onViewDetails,
  watchlist = new Set(),
  skeletonCount = 6,
}) {
  const showSkeleton = loading && movies.length === 0;
  const showEmpty    = !loading && movies.length === 0;

  return (
    <section className="space-y-3.5">
      <div className="flex items-center gap-2">
        <Icon size={17} strokeWidth={1.9} style={{ color: iconColor }} className="flex-shrink-0" />
        <div>
          <h2 className="text-[0.97rem] font-bold text-[#eeeef5] tracking-tight leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[0.75rem] text-[#52526a] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {showEmpty ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <MovieCarousel
          movies={movies}
          loading={showSkeleton}
          skeletonCount={skeletonCount}
          onAddToWatchlist={onAddToWatchlist}
          onViewDetails={onViewDetails}
          watchlist={watchlist}
        />
      )}
    </section>
  );
}
