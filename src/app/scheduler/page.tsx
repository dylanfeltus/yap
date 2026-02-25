"use client";

import { useCallback, useEffect, useState } from "react";
import { cn, STATUS_COLORS, parseJSON } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Plus,
  Trash2,
  Check,
  X,
  Send,
  Calendar,
  ArrowRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScheduledPost {
  id: string;
  draftId: string;
  platform: string;
  scheduledAt: string;
  postedAt?: string | null;
  externalId?: string | null;
  status: "queued" | "posted" | "failed";
  error?: string | null;
  createdAt: string;
  draft?: {
    id: string;
    content: string;
    platform: string;
    lanes?: string[];
    products?: string[];
  };
}

interface TimeSlot {
  id: string;
  time: string; // HH:MM
  platforms: string[];
  isActive: boolean;
  createdAt: string;
}

interface Draft {
  id: string;
  content: string;
  platform: string;
  suggestedTime?: string | null;
  lanes: string[];
  products: string[];
  status: string;
  createdAt: string;
}

type StatusFilter = "all" | "queued" | "posted" | "failed";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function platformColor(platform: string): string {
  switch (platform.toLowerCase()) {
    case "x":
      return "bg-sky-500/20 text-sky-400 border-sky-500/30";
    case "linkedin":
      return "bg-blue-600/20 text-blue-400 border-blue-600/30";
    default:
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  }
}

function truncate(text: string, maxLen = 120): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "...";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SchedulerPage() {
  // --- State ---------------------------------------------------------------
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [approvedDrafts, setApprovedDrafts] = useState<Draft[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);

  // Reschedule dialog
  const [rescheduleTarget, setRescheduleTarget] =
    useState<ScheduledPost | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  // Schedule draft dialog
  const [scheduleDraft, setScheduleDraft] = useState<Draft | null>(null);
  const [schedulePlatform, setSchedulePlatform] = useState("X");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  // New time slot
  const [newSlotTime, setNewSlotTime] = useState("09:00");
  const [newSlotPlatforms, setNewSlotPlatforms] = useState<string[]>([
    "X",
    "LinkedIn",
  ]);

  // --- Data Fetching -------------------------------------------------------

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/scheduler");
      if (res.ok) {
        const data = await res.json();
        setPosts(
          Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : []
        );
      }
    } catch {
      // silent
    }
  }, []);

  const fetchTimeSlots = useCallback(async () => {
    try {
      const res = await fetch("/api/timeslots");
      if (res.ok) {
        const data = await res.json();
        setTimeSlots(
          Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : []
        );
      }
    } catch {
      // silent
    }
  }, []);

  const fetchDrafts = useCallback(async () => {
    try {
      const res = await fetch("/api/drafts?status=approved");
      if (res.ok) {
        const data = await res.json();
        setApprovedDrafts(
          Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : []
        );
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchPosts(), fetchTimeSlots(), fetchDrafts()]).finally(() =>
      setLoading(false)
    );
  }, [fetchPosts, fetchTimeSlots, fetchDrafts]);

  // --- Actions -------------------------------------------------------------

  async function handleReschedule() {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTime) return;
    const scheduledAt = new Date(
      `${rescheduleDate}T${rescheduleTime}`
    ).toISOString();
    try {
      const res = await fetch(`/api/scheduler/${rescheduleTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt }),
      });
      if (res.ok) {
        await fetchPosts();
        setRescheduleTarget(null);
      }
    } catch {
      // silent
    }
  }

  async function handleCancel(id: string) {
    try {
      const res = await fetch(`/api/scheduler/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch {
      // silent
    }
  }

  async function handleMarkPosted(id: string) {
    try {
      const res = await fetch(`/api/scheduler/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "posted", postedAt: new Date().toISOString() }),
      });
      if (res.ok) {
        await fetchPosts();
      }
    } catch {
      // silent
    }
  }

  async function handleScheduleDraft() {
    if (!scheduleDraft || !scheduleDate || !scheduleTime) return;
    const scheduledAt = new Date(
      `${scheduleDate}T${scheduleTime}`
    ).toISOString();
    try {
      const res = await fetch("/api/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: scheduleDraft.id,
          platform: schedulePlatform,
          scheduledAt,
        }),
      });
      if (res.ok) {
        await Promise.all([fetchPosts(), fetchDrafts()]);
        setScheduleDraft(null);
      }
    } catch {
      // silent
    }
  }

  // Time slot actions
  async function handleAddTimeSlot() {
    if (!newSlotTime) return;
    try {
      const res = await fetch("/api/timeslots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time: newSlotTime,
          platforms: newSlotPlatforms,
          isActive: true,
        }),
      });
      if (res.ok) {
        await fetchTimeSlots();
        setNewSlotTime("09:00");
        setNewSlotPlatforms(["X", "LinkedIn"]);
      }
    } catch {
      // silent
    }
  }

  async function handleToggleSlot(slot: TimeSlot) {
    try {
      const res = await fetch(`/api/timeslots/${slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !slot.isActive }),
      });
      if (res.ok) {
        await fetchTimeSlots();
      }
    } catch {
      // silent
    }
  }

  async function handleDeleteSlot(id: string) {
    try {
      const res = await fetch(`/api/timeslots/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTimeSlots((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      // silent
    }
  }

  async function handleUpdateSlotPlatforms(slot: TimeSlot, platforms: string[]) {
    try {
      const res = await fetch(`/api/timeslots/${slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms }),
      });
      if (res.ok) {
        await fetchTimeSlots();
      }
    } catch {
      // silent
    }
  }

  // --- Derived data --------------------------------------------------------

  const filteredPosts = posts
    .filter((p) => statusFilter === "all" || p.status === statusFilter)
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );

  const queuedCount = posts.filter((p) => p.status === "queued").length;
  const postedCount = posts.filter((p) => p.status === "posted").length;
  const failedCount = posts.filter((p) => p.status === "failed").length;

  // --- Helpers for opening dialogs -----------------------------------------

  function openReschedule(post: ScheduledPost) {
    const d = new Date(post.scheduledAt);
    setRescheduleDate(format(d, "yyyy-MM-dd"));
    setRescheduleTime(format(d, "HH:mm"));
    setRescheduleTarget(post);
  }

  function openScheduleDraft(draft: Draft) {
    setSchedulePlatform(draft.platform === "Both" ? "X" : draft.platform);
    setScheduleDate("");
    setScheduleTime("");
    setScheduleDraft(draft);
  }

  // --- Render helper: format slot time for display -------------------------

  function formatSlotTime(time: string): string {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
  }

  // --- Render --------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-zinc-500">Loading scheduler...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Scheduler</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage your publishing queue, time slots, and schedule approved drafts.
        </p>
      </div>

      {/* Pipeline Visualization */}
      <Card className="border-zinc-700 bg-zinc-900">
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-3">
            {/* Draft step */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-400">
                <Calendar className="h-5 w-5" />
              </div>
              <span className="text-xs text-zinc-400">Drafts</span>
              <span className="text-sm font-semibold text-zinc-200">
                {approvedDrafts.length}
              </span>
            </div>

            <ArrowRight className="h-5 w-5 text-zinc-600" />

            {/* Scheduled step */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                <Clock className="h-5 w-5" />
              </div>
              <span className="text-xs text-zinc-400">Queued</span>
              <span className="text-sm font-semibold text-zinc-200">
                {queuedCount}
              </span>
            </div>

            <ArrowRight className="h-5 w-5 text-zinc-600" />

            {/* Posted step */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                <Send className="h-5 w-5" />
              </div>
              <span className="text-xs text-zinc-400">Posted</span>
              <span className="text-sm font-semibold text-zinc-200">
                {postedCount}
              </span>
            </div>

            {failedCount > 0 && (
              <>
                <Separator orientation="vertical" className="mx-2 h-10" />
                <div className="flex flex-col items-center gap-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                    <X className="h-5 w-5" />
                  </div>
                  <span className="text-xs text-zinc-400">Failed</span>
                  <span className="text-sm font-semibold text-zinc-200">
                    {failedCount}
                  </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT: Queue (2/3 width) */}
        <div className="space-y-4 lg:col-span-2">
          {/* Queue Header + Filter */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-100">
              Publishing Queue
            </h2>
            <div className="flex gap-1">
              {(
                [
                  { value: "all", label: "All" },
                  { value: "queued", label: "Queued" },
                  { value: "posted", label: "Posted" },
                  { value: "failed", label: "Failed" },
                ] as const
              ).map(({ value, label }) => (
                <Button
                  key={value}
                  variant={statusFilter === value ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter(value)}
                  className={cn(
                    "text-xs",
                    statusFilter === value &&
                      "bg-zinc-700 text-zinc-100"
                  )}
                >
                  {label}
                  {value === "queued" && queuedCount > 0 && (
                    <span className="ml-1 text-zinc-400">({queuedCount})</span>
                  )}
                  {value === "failed" && failedCount > 0 && (
                    <span className="ml-1 text-red-400">({failedCount})</span>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Queue List */}
          {filteredPosts.length === 0 ? (
            <Card className="border-zinc-700 bg-zinc-900">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="mb-3 h-10 w-10 text-zinc-600" />
                <p className="text-sm text-zinc-500">
                  {statusFilter === "all"
                    ? "No scheduled posts yet. Schedule an approved draft to get started."
                    : `No ${statusFilter} posts.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredPosts.map((post) => {
                const contentPreview =
                  post.draft?.content ?? "(Draft content unavailable)";
                const isPast = new Date(post.scheduledAt) < new Date();

                return (
                  <Card
                    key={post.id}
                    className="border-zinc-700 bg-zinc-900 transition-colors hover:border-zinc-600"
                  >
                    <CardContent className="flex items-start gap-4 py-4">
                      {/* Content + Meta */}
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="text-sm leading-relaxed text-zinc-300">
                          {truncate(contentPreview)}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              platformColor(post.platform)
                            )}
                          >
                            {post.platform}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              STATUS_COLORS[post.status] ?? ""
                            )}
                          >
                            {post.status}
                          </Badge>
                          <span className="flex items-center gap-1 text-xs text-zinc-500">
                            <Clock className="h-3 w-3" />
                            {format(
                              new Date(post.scheduledAt),
                              "MMM d, yyyy 'at' h:mm a"
                            )}
                          </span>
                          {post.status === "queued" && isPast && (
                            <span className="text-xs text-amber-400">
                              (overdue)
                            </span>
                          )}
                          {post.status === "queued" && !isPast && (
                            <span className="text-xs text-zinc-500">
                              {formatDistanceToNow(new Date(post.scheduledAt), {
                                addSuffix: true,
                              })}
                            </span>
                          )}
                          {post.error && (
                            <span className="text-xs text-red-400">
                              {post.error}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1">
                        {post.status === "queued" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Reschedule"
                              onClick={() => openReschedule(post)}
                              className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Mark as posted"
                              onClick={() => handleMarkPosted(post.id)}
                              className="h-8 w-8 text-zinc-400 hover:text-green-400"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Cancel"
                              onClick={() => handleCancel(post.id)}
                              className="h-8 w-8 text-zinc-400 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {post.status === "failed" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Reschedule"
                              onClick={() => openReschedule(post)}
                              className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Cancel"
                              onClick={() => handleCancel(post.id)}
                              className="h-8 w-8 text-zinc-400 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {post.status === "posted" && (
                          <span className="flex items-center gap-1 text-xs text-green-400">
                            <Check className="h-3 w-3" />
                            Posted
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Time Slots + Approved Drafts (1/3 width) */}
        <div className="space-y-6">
          {/* Time Slot Configuration */}
          <Card className="border-zinc-700 bg-zinc-900">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
                <Clock className="h-4 w-4 text-zinc-400" />
                Time Slots
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing slots */}
              {timeSlots.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  No time slots configured. Add one below.
                </p>
              ) : (
                <div className="space-y-2">
                  {timeSlots
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((slot) => {
                      const platforms: string[] = Array.isArray(slot.platforms)
                        ? slot.platforms
                        : parseJSON<string[]>(
                            slot.platforms as unknown as string,
                            []
                          );

                      return (
                        <div
                          key={slot.id}
                          className={cn(
                            "flex items-center justify-between rounded-lg border px-3 py-2",
                            slot.isActive
                              ? "border-zinc-700 bg-zinc-800"
                              : "border-zinc-800 bg-zinc-800/40 opacity-60"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={slot.isActive}
                              onCheckedChange={() => handleToggleSlot(slot)}
                            />
                            <span
                              className={cn(
                                "text-sm font-medium",
                                slot.isActive
                                  ? "text-zinc-200"
                                  : "text-zinc-500"
                              )}
                            >
                              {formatSlotTime(slot.time)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Platform toggles */}
                            <div className="flex gap-1">
                              {["X", "LinkedIn"].map((p) => {
                                const active = platforms.includes(p);
                                return (
                                  <button
                                    key={p}
                                    onClick={() => {
                                      const next = active
                                        ? platforms.filter((pl) => pl !== p)
                                        : [...platforms, p];
                                      if (next.length > 0) {
                                        handleUpdateSlotPlatforms(slot, next);
                                      }
                                    }}
                                    className={cn(
                                      "rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors",
                                      active
                                        ? platformColor(p)
                                        : "bg-zinc-800 text-zinc-600"
                                    )}
                                  >
                                    {p}
                                  </button>
                                );
                              })}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-zinc-500 hover:text-red-400"
                              onClick={() => handleDeleteSlot(slot.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              <Separator className="bg-zinc-800" />

              {/* Add new slot */}
              <div className="space-y-3">
                <Label className="text-xs text-zinc-400">Add Time Slot</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={newSlotTime}
                    onChange={(e) => setNewSlotTime(e.target.value)}
                    className="h-8 w-28 border-zinc-700 bg-zinc-800 text-sm text-zinc-200"
                  />
                  <div className="flex gap-1">
                    {["X", "LinkedIn"].map((p) => {
                      const active = newSlotPlatforms.includes(p);
                      return (
                        <button
                          key={p}
                          onClick={() =>
                            setNewSlotPlatforms((prev) =>
                              active
                                ? prev.filter((pl) => pl !== p)
                                : [...prev, p]
                            )
                          }
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors",
                            active
                              ? platformColor(p)
                              : "bg-zinc-800 text-zinc-600"
                          )}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0 border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    onClick={handleAddTimeSlot}
                    disabled={newSlotPlatforms.length === 0}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approved Drafts Ready to Schedule */}
          <Card className="border-zinc-700 bg-zinc-900">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
                <Send className="h-4 w-4 text-zinc-400" />
                Approved Drafts
                {approvedDrafts.length > 0 && (
                  <Badge
                    variant="outline"
                    className="ml-auto bg-blue-500/20 text-xs text-blue-400"
                  >
                    {approvedDrafts.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {approvedDrafts.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  No approved drafts waiting to be scheduled.
                </p>
              ) : (
                <div className="space-y-2">
                  {approvedDrafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="group rounded-lg border border-zinc-800 bg-zinc-800/60 p-3 transition-colors hover:border-zinc-700"
                    >
                      <p className="mb-2 text-sm leading-relaxed text-zinc-300">
                        {truncate(draft.content, 100)}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              platformColor(draft.platform)
                            )}
                          >
                            {draft.platform}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-blue-400 opacity-0 transition-opacity hover:text-blue-300 group-hover:opacity-100"
                          onClick={() => openScheduleDraft(draft)}
                        >
                          <Calendar className="mr-1 h-3 w-3" />
                          Schedule
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ---------- Reschedule Dialog ---------- */}
      <Dialog
        open={rescheduleTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRescheduleTarget(null);
        }}
      >
        <DialogContent className="border-zinc-700 bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Reschedule Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-zinc-400">
              {rescheduleTarget?.draft?.content
                ? truncate(rescheduleTarget.draft.content, 80)
                : "Select a new date and time for this post."}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Date</Label>
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="border-zinc-700 bg-zinc-800 text-zinc-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Time</Label>
                <Input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="border-zinc-700 bg-zinc-800 text-zinc-200"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRescheduleTarget(null)}
              className="text-zinc-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={!rescheduleDate || !rescheduleTime}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Schedule Draft Dialog ---------- */}
      <Dialog
        open={scheduleDraft !== null}
        onOpenChange={(open) => {
          if (!open) setScheduleDraft(null);
        }}
      >
        <DialogContent className="border-zinc-700 bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Schedule Draft</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-zinc-400">
              {scheduleDraft
                ? truncate(scheduleDraft.content, 100)
                : ""}
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Platform</Label>
                <Select
                  value={schedulePlatform}
                  onValueChange={setSchedulePlatform}
                >
                  <SelectTrigger className="border-zinc-700 bg-zinc-800 text-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="X">X</SelectItem>
                    <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Date</Label>
                  <Input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="border-zinc-700 bg-zinc-800 text-zinc-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Time</Label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="border-zinc-700 bg-zinc-800 text-zinc-200"
                  />
                </div>
              </div>

              {/* Quick-pick from configured time slots */}
              {timeSlots.filter((s) => s.isActive).length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">
                    Quick pick a time slot
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {timeSlots
                      .filter((s) => s.isActive)
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => setScheduleTime(slot.time)}
                          className={cn(
                            "rounded-md border px-2 py-1 text-xs transition-colors",
                            scheduleTime === slot.time
                              ? "border-blue-500 bg-blue-500/20 text-blue-400"
                              : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                          )}
                        >
                          {formatSlotTime(slot.time)}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setScheduleDraft(null)}
              className="text-zinc-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleScheduleDraft}
              disabled={!scheduleDate || !scheduleTime}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
