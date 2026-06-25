import { Smile, Frown, Meh, Leaf, PartyPopper, Heart, Brain, Angry } from "lucide-react";

// eslint-disable-next-line react-refresh/only-export-components
export const MOOD_CONFIG = {
  happy:    { label: "Happy",    icon: Smile,       color: "#fbbf24" },
  sad:      { label: "Sad",      icon: Frown,       color: "#60a5fa" },
  relaxed:  { label: "Relaxed",  icon: Leaf,        color: "#34d399" },
  excited:  { label: "Excited",  icon: PartyPopper, color: "#fb923c" },
  bored:    { label: "Bored",    icon: Meh,         color: "#94a3b8" },
  romantic: { label: "Romantic", icon: Heart,       color: "#fb7185" },
  stressed: { label: "Stressed", icon: Brain,       color: "#c084fc" },
  angry:    { label: "Angry",    icon: Angry,       color: "#ef4444" },
};

function formatRelativeTime(iso) {
  if (!iso) return "";
  const then    = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 1)  return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24)   return `${hours}h ago`;
  const days  = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

const SIZE_MAP = {
  sm: { text: "text-[0.74rem]", icon: 12, px: "px-2.5", py: "py-1",   gap: "gap-1.5" },
  md: { text: "text-[0.85rem]", icon: 14, px: "px-3",   py: "py-1.5", gap: "gap-2"   },
  lg: { text: "text-[0.95rem]", icon: 18, px: "px-4",   py: "py-2",   gap: "gap-2.5" },
};

export default function MoodBadge({ mood, timestamp, size = "md", showTime = false }) {
  if (!mood) return null;

  const key    = mood.toLowerCase().trim();
  const config = MOOD_CONFIG[key] ?? { label: mood, icon: Smile, color: "#9292b0" };
  const s      = SIZE_MAP[size] ?? SIZE_MAP.md;
  const Icon   = config.icon;

  return (
    <span
      className={`inline-flex items-center ${s.gap} rounded-full border ${s.px} ${s.py} ${s.text} font-semibold`}
      style={{
        borderColor: `color-mix(in srgb, ${config.color} 50%, transparent)`,
        background:  `color-mix(in srgb, ${config.color} 14%, #1a1a24)`,
        color:        config.color,
        boxShadow:   `0 0 14px color-mix(in srgb, ${config.color} 18%, transparent)`,
      }}
    >
      <Icon size={s.icon} strokeWidth={1.8} />
      {config.label}
      {showTime && timestamp && (
        <span className="text-[0.7rem] opacity-55 ml-0.5">
          {formatRelativeTime(timestamp)}
        </span>
      )}
    </span>
  );
}
