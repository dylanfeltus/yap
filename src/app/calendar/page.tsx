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
import {
  cn,
  LANE_COLORS,
  CALENDAR_LANE_COLORS,
  STATUS_COLORS,
  parseJSON,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CalendarItemType = "idea" | "draft" | "scheduled";

interface CalendarItem {
  id: string;
  type: CalendarItemType;
  title: string;
  content: string;
  date: Date;
  lanes: string[];
  products: string[];
  platform: string;
  status: string;
  raw: Record<string, unknown>;
}

type ViewMode = "week" | "month";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function primaryLane(lanes: string[]): string {
  return lanes[0] || "AI/Builder";
}

function statusLabel(item: CalendarItem): string {
  if (item.type === "idea") return "idea";
  if (item.type === "draft") return item.status || "draft";
  if (item.type === "scheduled") return item.status === "posted" ? "posted" : "scheduled";
  return item.status;
}

function itemsForDay(items: CalendarItem[], day: Date): CalendarItem[] {
  return items.filter((item) => isSameDay(item.date, day));
}

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newIdeaDate, setNewIdeaDate] = useState<Date | null>(null);
  const [newIdeaTitle, setNewIdeaTitle] = useState("");
  const [newIdeaNotes, setNewIdeaNotes] = useState("");
  const [creating, setCreating] = useState(false);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ideasRes, draftsRes, schedulerRes] = await Promise.all([
        fetch("/api/ideas"),
        fetch("/api/drafts"),
        fetch("/api/scheduler"),
      ]);

      const ideas = await ideasRes.json();
      const drafts = await draftsRes.json();
      const scheduled = await schedulerRes.json();

      const calendarItems: CalendarItem[] = [];

      // Ideas — use createdAt as the date anchor
      for (const idea of ideas) {
        if (!idea.createdAt) continue;
        calendarItems.push({
          id: idea.id,
          type: "idea",
          title: idea.title || "Untitled Idea",
          content: idea.notes || "",
          date: new Date(idea.createdAt),
          lanes: parseJSON<string[]>(idea.lanes, []),
          products: parseJSON<string[]>(idea.products, []),
          platform: idea.platform || "Both",
          status: idea.status || "idea",
          raw: idea,
        });
      }

      // Drafts — use suggestedTime if available, else createdAt
      for (const draft of drafts) {
        const dateStr = draft.suggestedTime || draft.createdAt;
        if (!dateStr) continue;
        calendarItems.push({
          id: draft.id,
          type: "draft",
          title:
            draft.content?.slice(0, 60) +
              (draft.content?.length > 60 ? "..." : "") || "Draft",
          content: draft.content || "",
          date: new Date(dateStr),
          lanes: parseJSON<string[]>(draft.lanes, []),
          products: parseJSON<string[]>(draft.products, []),
          platform: draft.platform || "X",
          status: draft.status || "draft",
          raw: draft,
        });
      }

      // Scheduled posts — use scheduledAt
      for (const post of scheduled) {
        if (!post.scheduledAt) continue;
        const draft = post.draft || {};
        calendarItems.push({
          id: post.id,
          type: "scheduled",
          title:
            draft.content?.slice(0, 60) +
              (draft.content?.length > 60 ? "..." : "") || "Scheduled Post",
          content: draft.content || "",
          date: new Date(post.scheduledAt),
          lanes: parseJSON<string[]>(draft.lanes || "[]", []),
          products: parseJSON<string[]>(draft.products || "[]", []),
          platform: post.platform || "X",
          status: post.status || "queued",
          raw: post,
        });
      }

      setItems(calendarItems);
    } catch (err) {
      console.error("Failed to fetch calendar data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  function goToday() {
    setCurrentDate(new Date());
  }

  function goPrev() {
    setCurrentDate((d) => (view === "week" ? subWeeks(d, 1) : subMonths(d, 1)));
  }

  function goNext() {
    setCurrentDate((d) => (view === "week" ? addWeeks(d, 1) : addMonths(d, 1)));
  }

  // -------------------------------------------------------------------------
  // Date ranges
  // -------------------------------------------------------------------------

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthGridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: monthGridStart, end: monthGridEnd });

  // -------------------------------------------------------------------------
  // Create new idea on empty day click
  // -------------------------------------------------------------------------

  function handleEmptyDayClick(day: Date) {
    setNewIdeaDate(day);
    setNewIdeaTitle("");
    setNewIdeaNotes("");
  }

  async function handleCreateIdea() {
    if (!newIdeaDate || !newIdeaTitle.trim()) return;
    setCreating(true);
    try {
      await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newIdeaTitle.trim(),
          notes: newIdeaNotes.trim(),
          lanes: [],
          products: [],
          platform: "Both",
          status: "idea",
        }),
      });
      setNewIdeaDate(null);
      fetchData();
    } catch (err) {
      console.error("Failed to create idea:", err);
    } finally {
      setCreating(false);
    }
  }

  // -------------------------------------------------------------------------
  // Item click — open detail dialog
  // -------------------------------------------------------------------------

  function handleItemClick(item: CalendarItem) {
    setSelectedItem(item);
    setDialogOpen(true);
  }

  // -------------------------------------------------------------------------
  // Navigation label
  // -------------------------------------------------------------------------

  const navLabel =
    view === "week"
      ? `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
      : format(currentDate, "MMMM yyyy");

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  function renderItemCard(item: CalendarItem) {
    const lane = primaryLane(item.lanes);
    const calendarColor = CALENDAR_LANE_COLORS[lane] || "border-l-zinc-500 bg-zinc-500/10";
    const status = statusLabel(item);

    return (
      <button
        key={`${item.type}-${item.id}`}
        onClick={(e) => {
          e.stopPropagation();
          handleItemClick(item);
        }}
        className={cn(
          "w-full text-left rounded-md border-l-2 px-2 py-1.5 text-xs transition-colors hover:brightness-125 cursor-pointer",
          calendarColor
        )}
      >
        <p className="font-medium text-zinc-100 truncate leading-tight">
          {item.title}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className={cn(
              "inline-block rounded px-1 py-0.5 text-[10px] font-medium leading-none",
              STATUS_COLORS[status] || STATUS_COLORS["idea"]
            )}
          >
            {status}
          </span>
          {item.platform && (
            <span className="text-[10px] text-zinc-500">{item.platform}</span>
          )}
        </div>
      </button>
    );
  }

  function renderMonthPill(item: CalendarItem) {
    const lane = primaryLane(item.lanes);
    const calendarColor = CALENDAR_LANE_COLORS[lane] || "border-l-zinc-500 bg-zinc-500/10";
    const status = statusLabel(item);

    return (
      <button
        key={`${item.type}-${item.id}`}
        onClick={(e) => {
          e.stopPropagation();
          handleItemClick(item);
        }}
        className={cn(
          "w-full text-left rounded border-l-2 px-1.5 py-0.5 text-[11px] truncate transition-colors hover:brightness-125 cursor-pointer",
          calendarColor
        )}
        title={item.title}
      >
        <span className="text-zinc-200 truncate">{item.title}</span>
      </button>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-6 w-6 text-zinc-400" />
            <h1 className="text-2xl font-bold text-zinc-100">
              Content Calendar
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
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
        </div>

        {/* Navigation bar */}
        <div className="flex items-center justify-between mb-4">
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
              Idea
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
              Draft
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500/50" />
              Scheduled
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
              Posted
            </span>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="text-zinc-500 text-sm">Loading calendar...</div>
          </div>
        )}

        {/* ---------------------------------------------------------------
            WEEK VIEW
        --------------------------------------------------------------- */}
        {!loading && view === "week" && (
          <div className="grid grid-cols-7 gap-px bg-zinc-800 rounded-lg border border-zinc-800 overflow-hidden">
            {/* Day headers */}
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
                    isToday(day)
                      ? "bg-blue-600 text-white"
                      : "text-zinc-300"
                  )}
                >
                  {format(day, "d")}
                </div>
              </div>
            ))}

            {/* Day columns */}
            {weekDays.map((day, i) => {
              const dayItems = itemsForDay(items, day);
              return (
                <div
                  key={`col-${i}`}
                  onClick={() => {
                    if (dayItems.length === 0) handleEmptyDayClick(day);
                  }}
                  className={cn(
                    "bg-zinc-900/50 min-h-[280px] p-2 flex flex-col gap-1.5 transition-colors",
                    dayItems.length === 0 &&
                      "cursor-pointer hover:bg-zinc-900/80",
                    isToday(day) && "bg-zinc-900/80"
                  )}
                >
                  {dayItems.map((item) => renderItemCard(item))}
                  {dayItems.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-zinc-700 text-xs">+ New idea</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ---------------------------------------------------------------
            MONTH VIEW
        --------------------------------------------------------------- */}
        {!loading && view === "month" && (
          <div className="grid grid-cols-7 gap-px bg-zinc-800 rounded-lg border border-zinc-800 overflow-hidden">
            {/* Day headers */}
            {DAY_HEADERS.map((header) => (
              <div
                key={header}
                className="bg-zinc-900 px-2 py-2 text-center text-xs font-medium text-zinc-500 uppercase"
              >
                {header}
              </div>
            ))}

            {/* Day cells */}
            {monthDays.map((day, i) => {
              const dayItems = itemsForDay(items, day);
              const inCurrentMonth = isSameMonth(day, currentDate);

              return (
                <div
                  key={`cell-${i}`}
                  onClick={() => {
                    if (dayItems.length === 0 && inCurrentMonth)
                      handleEmptyDayClick(day);
                  }}
                  className={cn(
                    "bg-zinc-900/50 min-h-[110px] p-1.5 flex flex-col transition-colors",
                    !inCurrentMonth && "opacity-40",
                    dayItems.length === 0 &&
                      inCurrentMonth &&
                      "cursor-pointer hover:bg-zinc-900/80",
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

        {/* Lane color legend */}
        <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
          <span className="font-medium text-zinc-400">Lanes:</span>
          {Object.entries(LANE_COLORS).map(([lane, colorClass]) => (
            <span key={lane} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "w-2.5 h-2.5 rounded-sm border",
                  colorClass
                )}
              />
              {lane}
            </span>
          ))}
        </div>
      </div>

      {/* -----------------------------------------------------------------
          DETAIL DIALOG — view / edit a calendar item
      ----------------------------------------------------------------- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">
              {selectedItem?.type === "idea"
                ? "Idea"
                : selectedItem?.type === "draft"
                  ? "Draft"
                  : "Scheduled Post"}
            </DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              {/* Title / Content */}
              <div>
                <h3 className="text-sm font-semibold text-zinc-200 mb-1">
                  {selectedItem.type === "idea" ? "Title" : "Content"}
                </h3>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {selectedItem.type === "idea"
                    ? selectedItem.title
                    : selectedItem.content}
                </p>
              </div>

              {/* Notes for ideas */}
              {selectedItem.type === "idea" && selectedItem.content && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200 mb-1">
                    Notes
                  </h3>
                  <p className="text-sm text-zinc-400 whitespace-pre-wrap">
                    {selectedItem.content}
                  </p>
                </div>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap gap-2">
                {/* Status */}
                <Badge
                  className={cn(
                    "border-0 text-xs",
                    STATUS_COLORS[statusLabel(selectedItem)] ||
                      STATUS_COLORS["idea"]
                  )}
                >
                  {statusLabel(selectedItem)}
                </Badge>

                {/* Platform */}
                <Badge variant="outline" className="text-xs">
                  {selectedItem.platform}
                </Badge>

                {/* Lanes */}
                {selectedItem.lanes.map((lane) => (
                  <Badge
                    key={lane}
                    className={cn(
                      "border text-xs",
                      LANE_COLORS[lane] || "bg-zinc-700 text-zinc-300"
                    )}
                  >
                    {lane}
                  </Badge>
                ))}

                {/* Products */}
                {selectedItem.products.map((product) => (
                  <Badge key={product} variant="secondary" className="text-xs">
                    {product}
                  </Badge>
                ))}
              </div>

              {/* Date */}
              <div className="text-xs text-zinc-500">
                {format(selectedItem.date, "EEEE, MMMM d, yyyy 'at' h:mm a")}
              </div>

              {/* Scheduled post extra info */}
              {selectedItem.type === "scheduled" &&
                typeof selectedItem.raw.postedAt === "string" && (
                  <div className="text-xs text-green-400">
                    Posted at:{" "}
                    {format(
                      new Date(selectedItem.raw.postedAt),
                      "MMM d, yyyy h:mm a"
                    )}
                  </div>
                )}

              {/* Action links */}
              <div className="flex gap-2 pt-2">
                {selectedItem.type === "idea" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.location.href = `/ideas`;
                      setDialogOpen(false);
                    }}
                  >
                    View in Idea Bank
                  </Button>
                )}
                {selectedItem.type === "draft" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.location.href = `/drafts`;
                      setDialogOpen(false);
                    }}
                  >
                    View in Draft Workshop
                  </Button>
                )}
                {selectedItem.type === "scheduled" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.location.href = `/scheduler`;
                      setDialogOpen(false);
                    }}
                  >
                    View in Scheduler
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* -----------------------------------------------------------------
          NEW IDEA DIALOG — create idea from empty day click
      ----------------------------------------------------------------- */}
      <Dialog
        open={newIdeaDate !== null}
        onOpenChange={(open) => {
          if (!open) setNewIdeaDate(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">
              New Idea{" "}
              {newIdeaDate && (
                <span className="text-zinc-400 font-normal text-sm ml-2">
                  {format(newIdeaDate, "EEEE, MMMM d")}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={newIdeaTitle}
                onChange={(e) => setNewIdeaTitle(e.target.value)}
                placeholder="What's the idea?"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-600"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleCreateIdea();
                  }
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Notes
              </label>
              <textarea
                value={newIdeaNotes}
                onChange={(e) => setNewIdeaNotes(e.target.value)}
                placeholder="Any details..."
                rows={3}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-600 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNewIdeaDate(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateIdea}
                disabled={!newIdeaTitle.trim() || creating}
              >
                {creating ? "Creating..." : "Create Idea"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
