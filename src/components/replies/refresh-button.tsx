"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RefreshCw, Loader2 } from "lucide-react";

interface RefreshResult {
  newCandidates: number;
  checkedHandles: string[];
}

interface RefreshButtonProps {
  onRefreshComplete: () => void;
}

export function RefreshButton({ onRefreshComplete }: RefreshButtonProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    setProgress("Starting refresh...");
    try {
      const res = await fetch("/api/replies/refresh", { method: "POST" });
      if (res.ok) {
        const data: RefreshResult = await res.json();
        setProgress(
          data.newCandidates > 0
            ? `Found ${data.newCandidates} new candidate${data.newCandidates === 1 ? "" : "s"}`
            : "No new tweets found"
        );
        onRefreshComplete();
      } else {
        const err = await res.text();
        setProgress(`Error: ${err}`);
      }
    } catch {
      setProgress("Network error");
    } finally {
      setRefreshing(false);
      setTimeout(() => setProgress(""), 4000);
    }
  }, [onRefreshComplete]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(doRefresh, 30 * 60 * 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, doRefresh]);

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs border-zinc-700"
        onClick={doRefresh}
        disabled={refreshing}
      >
        {refreshing ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <RefreshCw className="mr-1 h-3 w-3" />
        )}
        Refresh all
      </Button>

      <div className="flex items-center gap-1.5">
        <Checkbox
          id="auto-refresh"
          checked={autoRefresh}
          onCheckedChange={(checked) => setAutoRefresh(checked === true)}
        />
        <Label htmlFor="auto-refresh" className="text-[11px] text-zinc-500 cursor-pointer select-none">
          Auto (30m)
        </Label>
      </div>

      {progress && (
        <span className="text-[11px] text-zinc-500">{progress}</span>
      )}
    </div>
  );
}
