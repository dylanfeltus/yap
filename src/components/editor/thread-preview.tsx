"use client";

import { cn } from "@/lib/utils";
import { PLATFORM_LIMITS } from "@/lib/types";
import { MessageSquare } from "lucide-react";

interface ThreadPreviewProps {
  parts: string[];
  platform: string;
}

export function ThreadPreview({ parts, platform }: ThreadPreviewProps) {
  const limit = PLATFORM_LIMITS[platform] ?? 280;
  const total = parts.length;

  if (total === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
        <MessageSquare className="h-3.5 w-3.5" />
        Thread Preview ({total} {total === 1 ? "part" : "parts"})
      </div>
      <div className="space-y-2">
        {parts.map((part, idx) => {
          const charCount = part.length;
          const ratio = charCount / limit;
          const isWarning = ratio >= 0.9 && ratio < 1;
          const isOver = ratio >= 1;

          return (
            <div
              key={idx}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-zinc-500">
                  {idx + 1}/{total}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-mono",
                    isOver
                      ? "text-red-400"
                      : isWarning
                        ? "text-yellow-400"
                        : "text-zinc-500"
                  )}
                >
                  {charCount}/{limit}
                </span>
              </div>
              <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                {part || (
                  <span className="text-zinc-600 italic">Empty part</span>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
