"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { SlotCell } from "@/components/planner/slot-cell";
import { ConfigModal } from "@/components/planner/config-modal";
import { getWeekStart, DAYS, TIME_BLOCKS } from "@/lib/slot-utils";

interface ScheduledPostPreview {
  id: string;
  content: string;
  status: string;
}

interface SlotFillData {
  slotId: string;
  dayOfWeek: number;
  timeBlock: string;
  platform: string;
  targetCount: number;
  startHour: number;
  endHour: number;
  filledCount: number;
  scheduledPosts: ScheduledPostPreview[];
}

export default function PlannerPage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [fills, setFills] = useState<SlotFillData[]>([]);
  const [configOpen, setConfigOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const todayDow = (() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1; // Convert to 0=Mon
  })();

  const isCurrentWeek =
    getWeekStart(new Date()).getTime() === weekStart.getTime();

  const fetchFills = useCallback(async () => {
    setLoading(true);
    try {
      const weekParam = format(weekStart, "yyyy-MM-dd");
      const res = await fetch(`/api/slots/fill?week=${weekParam}`);
      if (res.ok) {
        const data: SlotFillData[] = await res.json();
        setFills(data);
      }
    } catch {
      // Failed to fetch
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchFills();
  }, [fetchFills]);

  function navigateWeek(delta: number) {
    setWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta * 7);
      return next;
    });
  }

  function goToThisWeek() {
    setWeekStart(getWeekStart(new Date()));
  }

  function getFillsForCell(dayOfWeek: number, timeBlock: string): SlotFillData[] {
    return fills.filter(
      (f) => f.dayOfWeek === dayOfWeek && f.timeBlock === timeBlock
    );
  }

  async function handleQuickCreate(dayOfWeek: number, timeBlock: string, platform: string) {
    try {
      const dayDate = addDays(weekStart, dayOfWeek);
      const block = TIME_BLOCKS.find((b) => b.id === timeBlock);
      if (!block) return;

      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "",
          platform,
          suggestedTime: new Date(
            dayDate.getFullYear(),
            dayDate.getMonth(),
            dayDate.getDate(),
            block.startHour
          ).toISOString(),
          status: "draft",
        }),
      });

      if (res.ok) {
        fetchFills();
      }
    } catch {
      // Failed to create draft
    }
  }

  const weekEnd = addDays(weekStart, 6);

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Weekly Planner</h1>
          <p className="text-sm text-zinc-500">
            Content slot schedule — fill your roster
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => navigateWeek(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToThisWeek}
              className={isCurrentWeek ? "bg-indigo-500/20 text-indigo-400" : ""}
            >
              This Week
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateWeek(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-sm text-zinc-400">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
          </span>
          <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
            <Settings className="mr-1.5 h-4 w-4" />
            Configure Slots
          </Button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center text-zinc-500">
          Loading…
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Day headers */}
          <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-2 mb-2">
            <div />
            {DAYS.map((day, idx) => (
              <div
                key={day}
                className={`text-center text-xs font-medium py-1.5 rounded-md ${
                  isCurrentWeek && idx === todayDow
                    ? "bg-indigo-500/20 text-indigo-400"
                    : "text-zinc-400"
                }`}
              >
                <div>{day}</div>
                <div className="text-[10px] text-zinc-600">
                  {format(addDays(weekStart, idx), "MMM d")}
                </div>
              </div>
            ))}
          </div>

          {/* Time block rows */}
          {TIME_BLOCKS.map((block) => (
            <div key={block.id} className="grid grid-cols-[80px_repeat(7,1fr)] gap-2 mb-2">
              <div className="flex flex-col justify-center text-right pr-2">
                <span className="text-xs font-medium text-zinc-400">{block.label}</span>
                <span className="text-[10px] text-zinc-600">{block.display}</span>
              </div>
              {DAYS.map((_, dayIdx) => (
                <SlotCell
                  key={dayIdx}
                  dayOfWeek={dayIdx}
                  timeBlock={block.id}
                  fills={getFillsForCell(dayIdx, block.id)}
                  isToday={isCurrentWeek && dayIdx === todayDow}
                  onQuickCreate={handleQuickCreate}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-zinc-500">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-red-500/30" /> Empty
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-yellow-500/30" /> Partial
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-green-500/30" /> Full
        </div>
      </div>

      <ConfigModal
        open={configOpen}
        onOpenChange={setConfigOpen}
        onSaved={fetchFills}
      />
    </div>
  );
}
