"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScheduledPostPreview {
  id: string;
  content: string;
  status: string;
}

interface SlotFill {
  slotId: string;
  platform: string;
  targetCount: number;
  filledCount: number;
  scheduledPosts: ScheduledPostPreview[];
}

interface SlotCellProps {
  dayOfWeek: number;
  timeBlock: string;
  fills: SlotFill[];
  isToday: boolean;
  onQuickCreate: (dayOfWeek: number, timeBlock: string, platform: string) => void;
}

function getFillColor(filled: number, target: number): string {
  if (target === 0) return "";
  const ratio = filled / target;
  if (ratio >= 1) return "bg-green-500/10 border-green-500/30";
  if (ratio > 0) return "bg-yellow-500/10 border-yellow-500/30";
  return "bg-red-500/10 border-red-500/20";
}

function getProgressColor(filled: number, target: number): string {
  if (target === 0) return "bg-zinc-600";
  const ratio = filled / target;
  if (ratio >= 1) return "bg-green-500";
  if (ratio > 0) return "bg-yellow-500";
  return "bg-red-500";
}

function PlatformBadge({ platform }: { platform: string }) {
  if (platform === "LinkedIn") {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-[#0A66C2]/20 text-[#0A66C2]">
        in
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-zinc-700 text-zinc-300">
      𝕏
    </span>
  );
}

export function SlotCell({ dayOfWeek, timeBlock, fills, isToday, onQuickCreate }: SlotCellProps) {
  const hasSlots = fills.length > 0;

  return (
    <div
      className={cn(
        "min-h-[100px] min-w-0 rounded-lg border p-2 transition-colors",
        isToday ? "ring-1 ring-indigo-500/40" : "",
        hasSlots ? "" : "border-dashed border-zinc-700/50"
      )}
    >
      {!hasSlots && (
        <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">
          No slots configured
        </div>
      )}
      {fills.map((fill) => (
        <div
          key={fill.slotId}
          className={cn(
            "mb-1.5 last:mb-0 rounded-md border p-1.5",
            getFillColor(fill.filledCount, fill.targetCount)
          )}
        >
          <div className="flex items-center justify-between gap-1">
            <PlatformBadge platform={fill.platform} />
            <span className="text-[10px] font-medium text-zinc-400">
              {fill.filledCount}/{fill.targetCount}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={cn("h-full rounded-full transition-all", getProgressColor(fill.filledCount, fill.targetCount))}
              style={{ width: `${Math.min(100, (fill.filledCount / Math.max(1, fill.targetCount)) * 100)}%` }}
            />
          </div>
          {/* Post previews */}
          {fill.scheduledPosts.slice(0, 2).map((post) => (
            <p key={post.id} className="mt-1 truncate text-[10px] text-zinc-500">
              {post.content.slice(0, 30)}…
            </p>
          ))}
          {/* Quick create */}
          {fill.filledCount < fill.targetCount && (
            <button
              onClick={() => onQuickCreate(dayOfWeek, timeBlock, fill.platform)}
              className="mt-1 flex items-center gap-0.5 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add draft
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
