"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Plus,
  GripVertical,
  X,
  Check,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { format, addDays } from "date-fns";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfigModal } from "@/components/planner/config-modal";
import {
  getWeekStart,
  getDateForDay,
  pickTimeInSlot,
  DAYS,
  TIME_BLOCKS,
} from "@/lib/slot-utils";
import { useLiveUpdates } from "@/lib/use-live-updates";
import { cn } from "@/lib/utils";

/* ─── Types ─── */

interface ScheduledPostPreview {
  id: string;
  draftId: string;
  content: string;
  platform: string;
  draftStatus: string;
  status: string;
  scheduledAt: string;
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

interface Draft {
  id: string;
  content: string;
  platform: string;
  status: string;
  createdAt: string;
  scheduledPosts: { id: string }[];
}

/* ─── Platform Badge ─── */

function PlatformBadge({ platform }: { platform: string }) {
  if (platform === "LinkedIn") {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-[#0A66C2]/20 text-[#0A66C2]">
        in
      </span>
    );
  }
  if (platform === "Article") {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-400">
        A
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-zinc-700 text-zinc-300">
      𝕏
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-yellow-500/20 text-yellow-400",
    approved: "bg-green-500/20 text-green-400",
    scheduled: "bg-blue-500/20 text-blue-400",
    posted: "bg-blue-500/20 text-blue-400",
    queued: "bg-blue-500/20 text-blue-400",
  };
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[9px] font-semibold capitalize",
        colors[status] || "bg-zinc-700 text-zinc-400"
      )}
    >
      {status}
    </span>
  );
}

/* ─── Draggable Draft Card ─── */

function DraggableCard({ draft }: { draft: Draft }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: draft.id });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-800/50 p-2.5 transition-colors hover:border-zinc-700 cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30"
      )}
      {...listeners}
      {...attributes}
    >
      <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600 group-hover:text-zinc-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-zinc-300">
          {draft.content
            ? draft.content.slice(0, 60) + (draft.content.length > 60 ? "…" : "")
            : "Empty draft"}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <PlatformBadge platform={draft.platform} />
          <StatusPill status={draft.status} />
        </div>
      </div>
    </div>
  );
}

/* Ghost card shown while dragging */
function DragGhostCard({ draft }: { draft: Draft }) {
  return (
    <div className="w-60 rounded-lg border border-indigo-500/50 bg-zinc-800 p-2.5 shadow-xl shadow-black/40 opacity-90">
      <p className="truncate text-xs text-zinc-300">
        {draft.content
          ? draft.content.slice(0, 60) + (draft.content.length > 60 ? "…" : "")
          : "Empty draft"}
      </p>
      <div className="mt-1.5 flex items-center gap-1.5">
        <PlatformBadge platform={draft.platform} />
        <StatusPill status={draft.status} />
      </div>
    </div>
  );
}

/* ─── Droppable Slot ─── */

function DroppableSlot({
  slotId,
  dayOfWeek,
  fill,
  isToday,
  onAction,
}: {
  slotId: string;
  dayOfWeek: number;
  fill: SlotFillData;
  isToday: boolean;
  onAction: (
    action: "approve" | "unapprove" | "remove",
    scheduledPostId: string,
    draftId: string
  ) => void;
}) {
  const droppableId = `slot-${slotId}-${dayOfWeek}`;
  const { isOver, setNodeRef } = useDroppable({ id: droppableId });
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  const isEmpty = fill.filledCount === 0;
  const isFull = fill.filledCount >= fill.targetCount;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-md border p-1.5 min-h-[60px] transition-all",
        isEmpty
          ? "border-dashed border-zinc-700/50"
          : isFull
            ? "border-green-500/30 bg-green-500/5"
            : "border-yellow-500/30 bg-yellow-500/5",
        isOver && !isFull && "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30",
        isOver && isFull && "border-red-500/50 bg-red-500/5"
      )}
    >
      {/* Header: platform + count */}
      <div className="flex items-center justify-between mb-1">
        <PlatformBadge platform={fill.platform} />
        <span
          className={cn(
            "text-[10px] font-medium",
            isFull ? "text-green-400" : isEmpty ? "text-zinc-600" : "text-yellow-400"
          )}
        >
          {fill.filledCount}/{fill.targetCount}
        </span>
      </div>

      {/* Scheduled posts */}
      {fill.scheduledPosts.map((post) => {
        const isExpanded = expandedPostId === post.id;
        return (
          <div key={post.id} className="relative">
            <button
              onClick={() => setExpandedPostId(isExpanded ? null : post.id)}
              className={cn(
                "w-full text-left rounded px-1.5 py-1 mb-0.5 last:mb-0 transition-colors",
                post.status === "posted"
                  ? "bg-blue-500/10 border border-blue-500/20"
                  : post.draftStatus === "approved"
                    ? "bg-green-500/10 border border-green-500/20"
                    : "bg-yellow-500/10 border border-yellow-500/20"
              )}
            >
              <p className="truncate text-[10px] text-zinc-300">
                {post.content.slice(0, 40)}
                {post.content.length > 40 ? "…" : ""}
              </p>
              <div className="mt-0.5 flex items-center gap-1">
                <StatusPill
                  status={post.status === "posted" ? "posted" : post.draftStatus}
                />
                <span className="text-[9px] text-zinc-600">
                  {format(new Date(post.scheduledAt), "h:mm a")}
                </span>
              </div>
            </button>

            {/* Actions popover */}
            {isExpanded && (
              <div className="absolute left-0 right-0 top-full z-20 mt-0.5 rounded-md border border-zinc-700 bg-zinc-800 p-1.5 shadow-lg">
                {post.status !== "posted" && (
                  <>
                    {post.draftStatus === "draft" ? (
                      <button
                        onClick={() => {
                          onAction("approve", post.id, post.draftId);
                          setExpandedPostId(null);
                        }}
                        className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-[11px] text-green-400 hover:bg-zinc-700/50"
                      >
                        <Check className="h-3 w-3" />
                        Approve
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onAction("unapprove", post.id, post.draftId);
                          setExpandedPostId(null);
                        }}
                        className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-[11px] text-yellow-400 hover:bg-zinc-700/50"
                      >
                        <X className="h-3 w-3" />
                        Unapprove
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onAction("remove", post.id, post.draftId);
                        setExpandedPostId(null);
                      }}
                      className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-[11px] text-red-400 hover:bg-zinc-700/50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove from slot
                    </button>
                  </>
                )}
                <a
                  href="/drafts"
                  className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-[11px] text-zinc-400 hover:bg-zinc-700/50"
                >
                  <ExternalLink className="h-3 w-3" />
                  Edit in Drafts
                </a>
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex items-center justify-center py-1">
          <span className="text-[9px] text-zinc-600">Drop draft here</span>
        </div>
      )}
    </div>
  );
}

/* ─── New Draft Inline Form ─── */

function NewDraftForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState("X");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          platform,
          status: "draft",
        }),
      });
      if (res.ok) {
        setContent("");
        setPlatform("X");
        setOpen(false);
        onCreated();
      }
    } catch {
      // Failed
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-1 h-3 w-3" />
        New Draft
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-800/50 p-2.5">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your draft..."
        rows={3}
        autoFocus
        className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
      />
      <div className="flex items-center gap-2">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
        >
          <option value="X">𝕏 / X</option>
          <option value="LinkedIn">LinkedIn</option>
          <option value="Article">Article</option>
        </select>
        <div className="flex-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs h-7"
          onClick={() => {
            setOpen(false);
            setContent("");
          }}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" className="text-xs h-7" disabled={saving || !content.trim()}>
          {saving ? "…" : "Add"}
        </Button>
      </div>
    </form>
  );
}

/* ─── Main Planner Page ─── */

export default function PlannerPage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [fills, setFills] = useState<SlotFillData[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [configOpen, setConfigOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeDraft, setActiveDraft] = useState<Draft | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const todayDow = (() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  })();

  const isCurrentWeek =
    getWeekStart(new Date()).getTime() === weekStart.getTime();

  /* Unscheduled drafts for the queue */
  const queueDrafts = drafts.filter(
    (d) =>
      (d.status === "draft" || d.status === "approved") &&
      d.scheduledPosts.length === 0
  );

  /* ── Fetch ── */

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const weekParam = format(weekStart, "yyyy-MM-dd");
      const [fillsRes, draftsRes] = await Promise.all([
        fetch(`/api/slots/fill?week=${weekParam}`),
        fetch("/api/drafts"),
      ]);
      if (fillsRes.ok) {
        setFills(await fillsRes.json());
      }
      if (draftsRes.ok) {
        setDrafts(await draftsRes.json());
      }
    } catch {
      // Failed
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useLiveUpdates("planner", fetchAll);
  useLiveUpdates("drafts", fetchAll);
  useLiveUpdates("scheduler", fetchAll);

  /* ── Week nav ── */

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

  /* ── Fills lookup ── */

  function getFillsForCell(dayOfWeek: number, timeBlock: string): SlotFillData[] {
    return fills.filter(
      (f) => f.dayOfWeek === dayOfWeek && f.timeBlock === timeBlock
    );
  }

  /* ── Slot actions ── */

  async function handleSlotAction(
    action: "approve" | "unapprove" | "remove",
    scheduledPostId: string,
    draftId: string
  ) {
    try {
      if (action === "approve") {
        await fetch(`/api/drafts/${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        });
      } else if (action === "unapprove") {
        await fetch(`/api/drafts/${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "draft" }),
        });
      } else if (action === "remove") {
        await fetch(`/api/scheduler/${scheduledPostId}`, {
          method: "DELETE",
        });
      }
      fetchAll();
    } catch {
      // Failed
    }
  }

  /* ── DnD handlers ── */

  function handleDragStart(event: DragStartEvent) {
    const draft = queueDrafts.find((d) => d.id === event.active.id);
    setActiveDraft(draft || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDraft(null);
    const { active, over } = event;
    if (!over) return;

    const overId = over.id as string;
    if (!overId.startsWith("slot-")) return;

    // Parse: slot-{slotId}-{dayOfWeek}
    const parts = overId.split("-");
    // slotId might contain hyphens (UUID), so take everything between first and last dash-segments
    const dayOfWeek = parseInt(parts[parts.length - 1], 10);
    const slotId = parts.slice(1, parts.length - 1).join("-");

    const draftId = active.id as string;
    const draft = queueDrafts.find((d) => d.id === draftId);
    if (!draft) return;

    // Find the slot fill data
    const fill = fills.find((f) => f.slotId === slotId && f.dayOfWeek === dayOfWeek);
    if (!fill) return;

    // Don't allow drop if slot is full
    if (fill.filledCount >= fill.targetCount) return;

    // Calculate scheduledAt
    const dayDate = getDateForDay(weekStart, dayOfWeek);
    const scheduledAt = pickTimeInSlot(dayDate, fill.startHour, fill.endHour);

    try {
      await fetch("/api/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          platform: draft.platform,
          scheduledAt: scheduledAt.toISOString(),
          slotId: fill.slotId,
        }),
      });
      fetchAll();
    } catch {
      // Failed
    }
  }

  const weekEnd = addDays(weekStart, 6);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-[calc(100vh-2rem)] flex-col">
        {/* Top bar */}
        <div className="flex flex-col gap-3 pb-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-bold text-zinc-100">Planner</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToThisWeek}
                className={
                  isCurrentWeek ? "bg-indigo-500/20 text-indigo-400" : ""
                }
              >
                This Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <span className="text-sm text-zinc-400">
              {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfigOpen(true)}
            >
              <Settings className="mr-1.5 h-4 w-4" />
              Config
            </Button>
          </div>
        </div>

        {/* Main layout: sidebar + grid */}
        <div className="flex flex-1 min-h-0 gap-0">
          {/* ── Left: Draft Queue ── */}
          <div className="w-[280px] shrink-0 border-r border-zinc-800 bg-zinc-900 flex flex-col rounded-l-lg">
            <div className="flex items-center justify-between px-3 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-zinc-200">Drafts</h2>
                <Badge
                  variant="secondary"
                  className="bg-zinc-800 text-zinc-400 text-[10px] px-1.5 py-0"
                >
                  {queueDrafts.length}
                </Badge>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-1.5">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-xs text-zinc-600">
                  Loading…
                </div>
              ) : queueDrafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-xs text-zinc-600">
                  <p>No unscheduled drafts</p>
                  <p className="mt-1 text-[10px]">Create one below or on the Drafts page</p>
                </div>
              ) : (
                queueDrafts.map((draft) => (
                  <DraggableCard key={draft.id} draft={draft} />
                ))
              )}
            </div>

            <div className="px-2.5 py-2.5 border-t border-zinc-800">
              <NewDraftForm onCreated={fetchAll} />
            </div>
          </div>

          {/* ── Right: Weekly Slot Grid ── */}
          <div className="flex-1 overflow-auto min-w-0">
            {loading ? (
              <div className="flex h-64 items-center justify-center text-zinc-500">
                Loading…
              </div>
            ) : (
              <div className="min-w-[700px] px-2">
                {/* Day headers */}
                <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-1.5 mb-1.5">
                  <div />
                  {DAYS.map((day, idx) => {
                    const dayDate = addDays(weekStart, idx);
                    const isTodayCol = isCurrentWeek && idx === todayDow;
                    return (
                      <div
                        key={day}
                        className={cn(
                          "text-center text-xs font-medium py-1.5 rounded-md",
                          isTodayCol
                            ? "bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30"
                            : "text-zinc-400"
                        )}
                      >
                        <div>{day}</div>
                        <div className="text-[10px] text-zinc-600">
                          {format(dayDate, "d")}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Time block rows */}
                {TIME_BLOCKS.map((block) => (
                  <div
                    key={block.id}
                    className="grid grid-cols-[80px_repeat(7,1fr)] gap-1.5 mb-1.5"
                  >
                    {/* Row label */}
                    <div className="flex flex-col justify-center text-right pr-2">
                      <span className="text-xs font-medium text-zinc-400">
                        {block.label}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        {block.display}
                      </span>
                    </div>

                    {/* Day cells */}
                    {DAYS.map((_, dayIdx) => {
                      const cellFills = getFillsForCell(dayIdx, block.id);
                      const isTodayCol = isCurrentWeek && dayIdx === todayDow;

                      if (cellFills.length === 0) {
                        return (
                          <div
                            key={dayIdx}
                            className={cn(
                              "min-h-[80px] rounded-lg border border-dashed border-zinc-700/50 p-2 flex items-center justify-center",
                              isTodayCol && "bg-indigo-500/5"
                            )}
                          >
                            <span className="text-[10px] text-zinc-700">
                              No slots
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={dayIdx}
                          className={cn(
                            "min-h-[80px] rounded-lg border border-zinc-800 p-1.5 space-y-1",
                            isTodayCol && "bg-indigo-500/5 ring-1 ring-indigo-500/30"
                          )}
                        >
                          {cellFills.map((fill) => (
                            <DroppableSlot
                              key={fill.slotId}
                              slotId={fill.slotId}
                              dayOfWeek={dayIdx}
                              fill={fill}
                              isToday={isTodayCol}
                              onAction={handleSlotAction}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drag overlay ghost */}
      <DragOverlay>
        {activeDraft ? <DragGhostCard draft={activeDraft} /> : null}
      </DragOverlay>

      <ConfigModal
        open={configOpen}
        onOpenChange={setConfigOpen}
        onSaved={fetchAll}
      />
    </DndContext>
  );
}
