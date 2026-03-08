"use client";

import { useEffect, useState, useCallback } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay,
  isToday,
  isSameMonth,
} from "date-fns";
import { cn, STATUS_COLORS, parseJSON } from "@/lib/utils";
import { Draft } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Bot,
} from "lucide-react";
import { DraftEditor } from "@/components/editor/draft-editor";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CalendarItem {
  id: string;
  type: "draft" | "scheduled";
  content: string;
  date: Date;
  platform: string;
  status: string;
  draft: Draft;
  isAgentCreated: boolean;
}

type ViewMode = "week" | "month";

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Status → color mapping for calendar blocks
const CALENDAR_STATUS_COLORS: Record<string, string> = {
  draft: "border-l-zinc-500 bg-zinc-500/10",
  approved: "border-l-yellow-500 bg-yellow-500/10",
  scheduled: "border-l-green-500 bg-green-500/10",
  posted: "border-l-blue-500 bg-blue-500/10",
  rejected: "border-l-red-500 bg-red-500/10",
};

function itemsForDay(items: CalendarItem[], day: Date): CalendarItem[] {
  return items.filter((item) => isSameDay(item.date, day));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [draftsRes, schedulerRes] = await Promise.all([
        fetch("/api/drafts"),
        fetch("/api/scheduler"),
      ]);

      if (!draftsRes.ok || !schedulerRes.ok) throw new Error("Fetch failed");

      const drafts: Draft[] = await draftsRes.json();
      const scheduled: Array<{
        id: string;
        draftId: string;
        platform: string;
        scheduledAt: string;
        status: string;
        draft?: Draft;
      }> = await schedulerRes.json();

      const calendarItems: CalendarItem[] = [];
      const scheduledDraftIds = new Set(scheduled.map((s) => s.draftId));

      // Drafts not in scheduler — show by suggestedTime or createdAt
      for (const draft of drafts) {
        if (scheduledDraftIds.has(draft.id)) continue;
        const dateStr = draft.suggestedTime || draft.createdAt;
        if (!dateStr) continue;

        // Heuristic: if no ideaId, likely agent-created
        const isAgentCreated = !draft.ideaId;

        calendarItems.push({
          id: draft.id,
          type: "draft",
          content: draft.content,
          date: new Date(dateStr),
          platform: draft.platform,
          status: draft.status,
          draft,
          isAgentCreated,
        });
      }

      // Scheduled posts
      for (const post of scheduled) {
        if (!post.scheduledAt || !post.draft) continue;
        const effectiveStatus =
          post.status === "posted" ? "posted" : post.draft.status;

        calendarItems.push({
          id: post.id,
          type: "scheduled",
          content: post.draft.content,
          date: new Date(post.scheduledAt),
          platform: post.platform,
          status: effectiveStatus,
          draft: post.draft,
          isAgentCreated: !post.draft.ideaId,
        });
      }

      setItems(calendarItems);
    } catch {
      // Fetch failed
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function goToday() {
    setCurrentDate(new Date());
  }
  function goPrev() {
    setCurrentDate((d) =>
      view === "week" ? subWeeks(d, 1) : subMonths(d, 1)
    );
  }
  function goNext() {
    setCurrentDate((d) =>
      view === "week" ? addWeeks(d, 1) : addMonths(d, 1)
    );
  }

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthGridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({
    start: monthGridStart,
    end: monthGridEnd,
  });

  const navLabel =
    view === "week"
      ? `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
      : format(currentDate, "MMMM yyyy");

  function handleItemClick(item: CalendarItem) {
    setEditingDraft(item.draft);
  }

  function handleEditorClose() {
    setEditingDraft(null);
    fetchData();
  }

  function renderItemCard(item: CalendarItem) {
    const color =
      CALENDAR_STATUS_COLORS[item.status] ?? CALENDAR_STATUS_COLORS.draft;

    return (
      <button
        key={`${item.type}-${item.id}`}
        onClick={(e) => {
          e.stopPropagation();
          handleItemClick(item);
        }}
        className={cn(
          "w-full text-left rounded-md border-l-2 px-2 py-1.5 text-xs transition-colors hover:brightness-125 cursor-pointer",
          color
        )}
      >
        <div className="flex items-center gap-1">
          <p className="font-medium text-zinc-100 truncate leading-tight flex-1">
            {item.content.slice(0, 50)}
            {item.content.length > 50 ? "…" : ""}
          </p>
          {item.isAgentCreated && (
            <Bot className="h-3 w-3 text-zinc-600 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className={cn(
              "inline-block rounded px-1 py-0.5 text-[10px] font-medium leading-none",
              STATUS_COLORS[item.status] ?? STATUS_COLORS["draft"]
            )}
          >
            {item.status}
          </span>
          <span className="text-[10px] text-zinc-500">{item.platform}</span>
        </div>
      </button>
    );
  }

  function renderMonthPill(item: CalendarItem) {
    const color =
      CALENDAR_STATUS_COLORS[item.status] ?? CALENDAR_STATUS_COLORS.draft;

    return (
      <button
        key={`${item.type}-${item.id}`}
        onClick={(e) => {
          e.stopPropagation();
          handleItemClick(item);
        }}
        className={cn(
          "w-full text-left rounded border-l-2 px-1.5 py-0.5 text-[11px] truncate transition-colors hover:brightness-125 cursor-pointer flex items-center gap-1",
          color
        )}
        title={item.content.slice(0, 100)}
      >
        {item.isAgentCreated && (
          <Bot className="h-2.5 w-2.5 text-zinc-600 shrink-0" />
        )}
        <span className="text-zinc-200 truncate">
          {item.content.slice(0, 40)}
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-6 w-6 text-zinc-400" />
          <h1 className="text-2xl font-bold text-zinc-100">
            Content Calendar
          </h1>
        </div>
        <div className="flex items-center rounded-lg border border-zinc-800 overflow-hidden">
          <button
            onClick={() => setView("week")}
            className={cn(
              "px-3 py-1.5 text-sm font-medium transition-colors",
              view === "week"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            Week
          </button>
          <button
            onClick={() => setView("month")}
            className={cn(
              "px-3 py-1.5 text-sm font-medium transition-colors",
              view === "month"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            Month
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
        </div>
        <span className="text-lg font-semibold text-zinc-200">{navLabel}</span>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-500/50" />
            Draft
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
            Approved
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
            Scheduled
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500/50" />
            Posted
          </span>
          <span className="flex items-center gap-1.5">
            <Bot className="h-3 w-3" />
            Agent
          </span>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-32">
          <p className="text-zinc-500 text-sm">Loading calendar…</p>
        </div>
      )}

      {/* Week View */}
      {!loading && view === "week" && (
        <div className="grid grid-cols-7 gap-px bg-zinc-800 rounded-lg border border-zinc-800 overflow-hidden">
          {weekDays.map((day, i) => (
            <div
              key={`header-${i}`}
              className="bg-zinc-900 px-3 py-2 text-center"
            >
              <div className="text-xs font-medium text-zinc-500 uppercase">
                {DAY_HEADERS[i]}
              </div>
              <div
                className={cn(
                  "mt-1 text-sm font-semibold inline-flex items-center justify-center w-7 h-7 rounded-full",
                  isToday(day) ? "bg-blue-600 text-white" : "text-zinc-300"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          ))}
          {weekDays.map((day, i) => {
            const dayItems = itemsForDay(items, day);
            return (
              <div
                key={`col-${i}`}
                className={cn(
                  "bg-zinc-900/50 min-h-[280px] p-2 flex flex-col gap-1.5",
                  isToday(day) && "bg-zinc-900/80"
                )}
              >
                {dayItems.map((item) => renderItemCard(item))}
              </div>
            );
          })}
        </div>
      )}

      {/* Month View */}
      {!loading && view === "month" && (
        <div className="grid grid-cols-7 gap-px bg-zinc-800 rounded-lg border border-zinc-800 overflow-hidden">
          {DAY_HEADERS.map((header) => (
            <div
              key={header}
              className="bg-zinc-900 px-2 py-2 text-center text-xs font-medium text-zinc-500 uppercase"
            >
              {header}
            </div>
          ))}
          {monthDays.map((day, i) => {
            const dayItems = itemsForDay(items, day);
            const inCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={`cell-${i}`}
                className={cn(
                  "bg-zinc-900/50 min-h-[110px] p-1.5 flex flex-col transition-colors",
                  !inCurrentMonth && "opacity-40",
                  isToday(day) && "bg-zinc-900/80 ring-1 ring-blue-600/50"
                )}
              >
                <div
                  className={cn(
                    "text-xs font-medium mb-1 px-0.5 self-end w-6 h-6 flex items-center justify-center rounded-full",
                    isToday(day)
                      ? "bg-blue-600 text-white"
                      : inCurrentMonth
                        ? "text-zinc-400"
                        : "text-zinc-600"
                  )}
                >
                  {format(day, "d")}
                </div>
                <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                  {dayItems.slice(0, 3).map((item) => renderMonthPill(item))}
                  {dayItems.length > 3 && (
                    <span className="text-[10px] text-zinc-500 px-1">
                      +{dayItems.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Dialog */}
      <Dialog
        open={editingDraft !== null}
        onOpenChange={(open) => {
          if (!open) handleEditorClose();
        }}
      >
        <DialogContent className="max-w-3xl h-[85vh] p-0 gap-0 flex flex-col">
          {editingDraft && (
            <DraftEditor
              draft={editingDraft}
              onClose={handleEditorClose}
              onSaved={fetchData}
              onStatusChange={() => fetchData()}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
