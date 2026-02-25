import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Configure these to match your content lanes and products
// You can also set CONTENT_LANES and CONTENT_PRODUCTS as comma-separated env vars
export const LANES = (process.env.NEXT_PUBLIC_CONTENT_LANES?.split(",").map(s => s.trim()) ?? [
  "AI/Builder",
  "Design",
  "Creator Economy",
  "Behind the Scenes",
]) as readonly string[];

export const PRODUCTS = (process.env.NEXT_PUBLIC_CONTENT_PRODUCTS?.split(",").map(s => s.trim()) ?? [
  "Product A",
  "Product B",
  "Product C",
]) as readonly string[];

export const PLATFORMS = ["X", "LinkedIn", "Both"] as const;

export const STATUSES = ["idea", "drafted", "scheduled", "posted"] as const;

export const DRAFT_STATUSES = [
  "draft",
  "approved",
  "scheduled",
  "posted",
  "rejected",
] as const;

// Auto-assigns colors to lanes. Add more colors if you have more than 6 lanes.
const LANE_COLOR_PALETTE = [
  "bg-violet-500/20 text-violet-400 border-violet-500/30",
  "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "bg-rose-500/20 text-rose-400 border-rose-500/30",
];

export const LANE_COLORS: Record<string, string> = Object.fromEntries(
  LANES.map((lane, i) => [lane, LANE_COLOR_PALETTE[i % LANE_COLOR_PALETTE.length]])
);

export const STATUS_COLORS: Record<string, string> = {
  idea: "bg-zinc-500/20 text-zinc-400",
  draft: "bg-yellow-500/20 text-yellow-400",
  drafted: "bg-yellow-500/20 text-yellow-400",
  approved: "bg-blue-500/20 text-blue-400",
  scheduled: "bg-blue-500/20 text-blue-400",
  queued: "bg-blue-500/20 text-blue-400",
  posted: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
  failed: "bg-red-500/20 text-red-400",
  new: "bg-zinc-500/20 text-zinc-400",
  replied: "bg-green-500/20 text-green-400",
  skipped: "bg-zinc-500/20 text-zinc-400",
};

const CALENDAR_COLOR_PALETTE = [
  "border-l-violet-500 bg-violet-500/10",
  "border-l-pink-500 bg-pink-500/10",
  "border-l-amber-500 bg-amber-500/10",
  "border-l-emerald-500 bg-emerald-500/10",
  "border-l-cyan-500 bg-cyan-500/10",
  "border-l-rose-500 bg-rose-500/10",
];

export const CALENDAR_LANE_COLORS: Record<string, string> = Object.fromEntries(
  LANES.map((lane, i) => [lane, CALENDAR_COLOR_PALETTE[i % CALENDAR_COLOR_PALETTE.length]])
);

export function parseJSON<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
