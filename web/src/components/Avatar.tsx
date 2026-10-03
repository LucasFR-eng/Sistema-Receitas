import { mediaUrl } from "../lib/recipes.ts";

const SIZES = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-20 text-2xl sm:size-24 sm:text-3xl",
} as const;

// Tons de fundo para as iniciais; a mesma pessoa sempre fica com a mesma cor
const COLORS = [
  "bg-orange-100 text-orange-800",
  "bg-amber-100 text-amber-800",
  "bg-lime-100 text-lime-800",
  "bg-emerald-100 text-emerald-800",
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
  "bg-rose-100 text-rose-800",
];

// "Maria da Silva" -> "MS"
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

function colorFor(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}

interface AvatarProps {
  name: string;
  avatarUrl: string | null;
  size?: keyof typeof SIZES;
}

export function Avatar({ name, avatarUrl, size = "md" }: AvatarProps) {
  if (avatarUrl) {
    return <img src={mediaUrl(avatarUrl)} alt="" className={`${SIZES[size]} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span
      aria-hidden
      className={`${SIZES[size]} ${colorFor(name)} inline-flex shrink-0 items-center justify-center rounded-full font-semibold`}
    >
      {initials(name)}
    </span>
  );
}
