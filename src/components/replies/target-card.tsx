"use client";

import { useState, useEffect } from "react";
import { cn, parseJSON } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReplyTarget {
  id: string;
  accountHandle: string;
  accountName: string;
  keywords: string;
  isActive: boolean;
  createdAt: string;
}

interface TargetStats {
  tweetCount: number;
  avgViews: number;
  repliedCount: number;
}

interface TargetCardProps {
  target: ReplyTarget;
  onToggle: (target: ReplyTarget) => void;
  onDelete: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TargetCard({ target, onToggle, onDelete }: TargetCardProps) {
  const [stats, setStats] = useState<TargetStats | null>(null);
  const keywords = parseJSON<string[]>(target.keywords, []);

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      try {
        const res = await fetch(`/api/replies/targets/${target.id}/stats`);
        if (res.ok && !cancelled) {
          const data: TargetStats = await res.json();
          setStats(data);
        }
      } catch {
        // Silently fail — stats are optional
      }
    }
    loadStats();
    return () => { cancelled = true; };
  }, [target.id]);

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-lg p-2.5 transition-colors",
        target.isActive
          ? "hover:bg-zinc-800/50"
          : "opacity-50 hover:bg-zinc-800/30"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <a
            href={`https://x.com/${target.accountHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-sm font-medium text-zinc-200 hover:text-indigo-400 transition-colors"
          >
            @{target.accountHandle}
          </a>
          {target.isActive ? (
            <Eye className="h-3 w-3 text-green-500/60 shrink-0" />
          ) : (
            <EyeOff className="h-3 w-3 text-zinc-600 shrink-0" />
          )}
        </div>
        {target.accountName && (
          <p className="truncate text-xs text-zinc-500">
            {target.accountName}
          </p>
        )}
        {keywords.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {keywords.map((kw, i) => (
              <Badge
                key={i}
                variant="outline"
                className="border-zinc-700 text-zinc-500 text-[10px] px-1.5 py-0"
              >
                {kw}
              </Badge>
            ))}
          </div>
        )}
        {stats && stats.tweetCount > 0 && (
          <p className="mt-1.5 text-[10px] text-zinc-600">
            Last 7d: {stats.tweetCount} tweets, avg {formatNumber(stats.avgViews)} views, {stats.repliedCount} replied
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onToggle(target)}
          title={target.isActive ? "Deactivate" : "Activate"}
        >
          {target.isActive ? (
            <EyeOff className="h-3 w-3" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-zinc-400 hover:text-red-400"
          onClick={() => onDelete(target.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
