import { useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MovieCard from "../MovieCard";

const SCROLL_BY = 600;

function SkeletonCard() {
  return (
    <div
      className="flex-shrink-0 rounded-xl overflow-hidden border border-white/[0.06] bg-[#13131a]"
      style={{ width: 185 }}
      aria-hidden="true"
    >
      <div
        className="animate-pulse bg-white/[0.04]"
        style={{ aspectRatio: "2/3" }}
      />
      <div className="p-3 space-y-2">
        <div className="h-3.5 rounded-md bg-white/[0.06] animate-pulse" />
        <div className="h-3 w-3/4 rounded-md bg-white/[0.06] animate-pulse" />
        <div className="flex gap-1 mt-1">
          <div className="h-4 w-14 rounded-full bg-white/[0.06] animate-pulse" />
          <div className="h-4 w-12 rounded-full bg-white/[0.06] animate-pulse" />
        </div>
        <div className="h-7 rounded-lg bg-white/[0.06] animate-pulse mt-1" />
      </div>
    </div>
  );
}

function ArrowButton({ direction, onClick, visible }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "left" ? "Scroll left" : "Scroll right"}
      className={[
        "absolute top-[38%] -translate-y-1/2 z-10",
        "flex h-8 w-8 items-center justify-center rounded-full",
        "border border-white/[0.12] bg-[#0d0d14]/90 backdrop-blur-sm",
        "text-[#c4c4d4] shadow-lg transition-all duration-200",
        "hover:border-white/25 hover:bg-[#1a1a24] hover:text-white",
        // always visible on touch devices; appear on hover on pointer devices
        "opacity-100 sm:opacity-0 sm:group-hover/car:opacity-100",
        direction === "left" ? "left-1" : "right-1",
        !visible ? "!opacity-0 pointer-events-none" : "",
      ].join(" ")}
    >
      {direction === "left" ? (
        <ChevronLeft size={17} strokeWidth={2.5} />
      ) : (
        <ChevronRight size={17} strokeWidth={2.5} />
      )}
    </button>
  );
}

export default function MovieCarousel({
  movies = [],
  onAddToWatchlist,
  onViewDetails,
  watchlist = new Set(),
  loading = false,
  skeletonCount = 6,
}) {
  const scrollRef = useRef(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(true);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 12);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 12);
  }, []);

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -SCROLL_BY : SCROLL_BY,
      behavior: "smooth",
    });
  };

  const showSkeleton = loading && movies.length === 0;
  const items        = showSkeleton
    ? Array.from({ length: skeletonCount })
    : movies;

  return (
    /* Wrapper extends slightly beyond parent padding for full-bleed feel */
    <div className="relative group/car -mx-5 px-5 sm:-mx-8 sm:px-8">
      <ArrowButton direction="left"  onClick={() => scroll("left")}  visible={canLeft}  />
      <ArrowButton direction="right" onClick={() => scroll("right")} visible={canRight} />

      {/* Track */}
      <div
        ref={scrollRef}
        onScroll={updateArrows}
        className="flex gap-3 overflow-x-auto pb-2 scroll-smooth"
        style={{
          scrollbarWidth:  "thin",
          scrollbarColor:  "rgba(139,92,246,0.22) transparent",
          scrollSnapType:  "x mandatory",
        }}
      >
        {items.map((movie, i) =>
          showSkeleton ? (
            <SkeletonCard key={i} />
          ) : (
            <div key={movie.id ?? i} style={{ scrollSnapAlign: "start" }}>
              <MovieCard
                movie={movie}
                onAddToWatchlist={onAddToWatchlist}
                onViewDetails={onViewDetails}
                isInWatchlist={watchlist.has(movie.id)}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}
