import {
  Zap, Laugh, Heart, Ghost, Siren, Rocket, Drama,
  Sparkles, Camera, Search, Compass, Wand2, Music,
  Globe, Users, Trophy, Shield, Film,
} from "lucide-react";

// eslint-disable-next-line react-refresh/only-export-components
export const GENRE_CONFIG = {
  action:              { label: "Action",       icon: Zap,      color: "#f97316" },
  comedy:              { label: "Comedy",       icon: Laugh,    color: "#fbbf24" },
  romance:             { label: "Romance",      icon: Heart,    color: "#fb7185" },
  horror:              { label: "Horror",       icon: Ghost,    color: "#a78bfa" },
  thriller:            { label: "Thriller",     icon: Siren,    color: "#ef4444" },
  "sci-fi":            { label: "Sci-Fi",       icon: Rocket,   color: "#22d3ee" },
  "science fiction":   { label: "Sci-Fi",       icon: Rocket,   color: "#22d3ee" },
  drama:               { label: "Drama",        icon: Drama,    color: "#60a5fa" },
  animation:           { label: "Animation",    icon: Sparkles, color: "#34d399" },
  animated:            { label: "Animation",    icon: Sparkles, color: "#34d399" },
  documentary:         { label: "Documentary",  icon: Camera,   color: "#94a3b8" },
  mystery:             { label: "Mystery",      icon: Search,   color: "#c084fc" },
  adventure:           { label: "Adventure",    icon: Compass,  color: "#fb923c" },
  fantasy:             { label: "Fantasy",      icon: Wand2,    color: "#8b5cf6" },
  music:               { label: "Music",        icon: Music,    color: "#ec4899" },
  history:             { label: "History",      icon: Globe,    color: "#d97706" },
  family:              { label: "Family",       icon: Users,    color: "#06b6d4" },
  sport:               { label: "Sport",        icon: Trophy,   color: "#84cc16" },
  sports:              { label: "Sports",       icon: Trophy,   color: "#84cc16" },
  crime:               { label: "Crime",        icon: Shield,   color: "#6b7280" },
  western:             { label: "Western",      icon: Film,     color: "#d97706" },
};

const SIZE_MAP = {
  xs: { text: "text-[0.68rem]", iconSize: 10, px: "px-1.5", py: "py-0.5", gap: "gap-1"   },
  sm: { text: "text-[0.74rem]", iconSize: 11, px: "px-2",   py: "py-0.5", gap: "gap-1"   },
  md: { text: "text-[0.8rem]",  iconSize: 13, px: "px-3",   py: "py-1.5", gap: "gap-1.5" },
};

export default function GenreBadge({ genre = "", size = "sm" }) {
  const key    = genre.toLowerCase().trim();
  const config = GENRE_CONFIG[key] ?? { label: genre, icon: Film, color: "#6b7280" };
  const s      = SIZE_MAP[size] ?? SIZE_MAP.sm;
  const Icon   = config.icon;

  return (
    <span
      className={`inline-flex items-center ${s.gap} rounded-full border ${s.px} ${s.py} ${s.text} font-semibold whitespace-nowrap`}
      style={{
        borderColor: `color-mix(in srgb, ${config.color} 38%, transparent)`,
        background:  `color-mix(in srgb, ${config.color} 12%, transparent)`,
        color:        config.color,
      }}
    >
      <Icon size={s.iconSize} strokeWidth={2} />
      {config.label}
    </span>
  );
}
