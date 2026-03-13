"use client";

import { useEffect, useState, useCallback } from "react";
import {
  cn,
  LANES,
  PRODUCTS,
  LANE_COLORS,
  STATUS_COLORS,
  parseJSON,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  FileText,
  Check,
  X,
  Clock,
  Send,
  Trash2,
  MessageSquare,
  Paperclip,
  Calendar,
  Loader2,
} from "lucide-react";
import { useLiveUpdates } from "@/lib/use-live-updates";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Draft {
  id: string;
  ideaId: string | null;
  content: string;
  platform: string;
  suggestedTime: string | null;
  lanes: string;
  products: string;
  status: string;
  rejectionNote: string | null;
  variations: string;
  isThread: boolean;
  threadParts: string;
  attachments: string;
  createdAt: string;
  updatedAt: string;
}

type DraftStatus = "all" | "draft" | "approved" | "scheduled" | "posted" | "rejected";

const STATUS_TABS: { value: DraftStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "posted", label: "Posted" },
  { value: "rejected", label: "Rejected" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "...";
}

// ---------------------------------------------------------------------------
// Slot Types & Helpers
// ---------------------------------------------------------------------------

interface SlotFill {
  slotId: string;
  dayOfWeek: number;
  timeBlock: string;
  platform: string;
  targetCount: number;
  startHour: number;
  endHour: number;
  filledCount: number;
  scheduledPosts: { id: string; content: string; status: string }[];
}

interface SlotWithDate extends SlotFill {
  dayDate: Date;
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TIME_BLOCK_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

function getWeekMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function formatSlotDay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function pickTimeInSlotClientSide(
  dayDate: Date,
  startHour: number,
  endHour: number,
): Date {
  const totalMinutes = (endHour - startHour) * 60;
  const randomMinute = Math.floor(Math.random() * totalMinutes);
  const hour = startHour + Math.floor(randomMinute / 60);
  const minute = randomMinute % 60;
  const result = new Date(dayDate);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function getDateForDay(weekStart: Date, dayOfWeek: number): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dayOfWeek);
  return d;
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<DraftStatus>("all");

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<Draft | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [rejectDraft, setRejectDraft] = useState<Draft | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [scheduleDraft, setScheduleDraft] = useState<Draft | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleTab, setScheduleTab] = useState<"slots" | "custom">("slots");
  const [slotsData, setSlotsData] = useState<SlotWithDate[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotScheduling, setSlotScheduling] = useState<string | null>(null);

  // Create form state
  const [newContent, setNewContent] = useState("");
  const [newPlatform, setNewPlatform] = useState("X");
  const [newLanes, setNewLanes] = useState<string[]>([]);
  const [newProducts, setNewProducts] = useState<string[]>([]);
  const [newSuggestedTime, setNewSuggestedTime] = useState("");
  const [newIsThread, setNewIsThread] = useState(false);
  const [newThreadParts, setNewThreadParts] = useState<string[]>([""]);
  const [newVariations, setNewVariations] = useState<string[]>([]);
  const [newAttachments, setNewAttachments] = useState<string[]>([]);
  const [newAttachmentInput, setNewAttachmentInput] = useState("");

  // Edit form state
  const [editContent, setEditContent] = useState("");
  const [editPlatform, setEditPlatform] = useState("X");
  const [editLanes, setEditLanes] = useState<string[]>([]);
  const [editProducts, setEditProducts] = useState<string[]>([]);
  const [editIsThread, setEditIsThread] = useState(false);
  const [editThreadParts, setEditThreadParts] = useState<string[]>([""]);
  const [editVariations, setEditVariations] = useState<string[]>([]);
  const [editAttachments, setEditAttachments] = useState<string[]>([]);
  const [editAttachmentInput, setEditAttachmentInput] = useState("");

  // -------------------------------------------------------------------------
  // Fetch drafts
  // -------------------------------------------------------------------------

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        statusFilter === "all"
          ? "/api/drafts"
          : `/api/drafts?status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      setDrafts(data);
    } catch (err) {
      console.error("Failed to fetch drafts:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  useLiveUpdates("drafts", fetchDrafts);

  // -------------------------------------------------------------------------
  // Create draft
  // -------------------------------------------------------------------------

  async function handleCreate() {
    const body: Record<string, unknown> = {
      content: newContent,
      platform: newPlatform,
      lanes: newLanes,
      products: newProducts,
      isThread: newIsThread,
      threadParts: newIsThread ? newThreadParts.filter((p) => p.trim()) : [],
      variations: newVariations.filter((v) => v.trim()),
      attachments: newAttachments,
    };
    if (newSuggestedTime) {
      body.suggestedTime = new Date(newSuggestedTime).toISOString();
    }
    await fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    resetCreateForm();
    setCreateOpen(false);
    fetchDrafts();
  }

  function resetCreateForm() {
    setNewContent("");
    setNewPlatform("X");
    setNewLanes([]);
    setNewProducts([]);
    setNewSuggestedTime("");
    setNewIsThread(false);
    setNewThreadParts([""]);
    setNewVariations([]);
    setNewAttachments([]);
    setNewAttachmentInput("");
  }

  // -------------------------------------------------------------------------
  // Edit / update draft
  // -------------------------------------------------------------------------

  function openEditDialog(draft: Draft) {
    setEditDraft(draft);
    setEditContent(draft.content);
    setEditPlatform(draft.platform);
    setEditLanes(parseJSON<string[]>(draft.lanes, []));
    setEditProducts(parseJSON<string[]>(draft.products, []));
    setEditIsThread(draft.isThread);
    setEditThreadParts(
      draft.isThread
        ? parseJSON<string[]>(draft.threadParts, [""])
        : [""]
    );
    setEditVariations(parseJSON<string[]>(draft.variations, []));
    setEditAttachments(parseJSON<string[]>(draft.attachments, []));
    setEditAttachmentInput("");
    setEditOpen(true);
  }

  async function handleUpdate() {
    if (!editDraft) return;
    await fetch(`/api/drafts/${editDraft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: editContent,
        platform: editPlatform,
        lanes: editLanes,
        products: editProducts,
        isThread: editIsThread,
        threadParts: editIsThread
          ? editThreadParts.filter((p) => p.trim())
          : [],
        variations: editVariations.filter((v) => v.trim()),
        attachments: editAttachments,
      }),
    });
    setEditOpen(false);
    setEditDraft(null);
    fetchDrafts();
  }

  // -------------------------------------------------------------------------
  // Approve
  // -------------------------------------------------------------------------

  async function handleApprove(draft: Draft) {
    await fetch(`/api/drafts/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    fetchDrafts();
  }

  // -------------------------------------------------------------------------
  // Reject
  // -------------------------------------------------------------------------

  function openRejectDialog(draft: Draft) {
    setRejectDraft(draft);
    setRejectNote("");
    setRejectOpen(true);
  }

  async function handleReject() {
    if (!rejectDraft) return;
    await fetch(`/api/drafts/${rejectDraft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected", rejectionNote: rejectNote }),
    });
    setRejectOpen(false);
    setRejectDraft(null);
    fetchDrafts();
  }

  // -------------------------------------------------------------------------
  // Schedule
  // -------------------------------------------------------------------------

  async function fetchSlots(platform: string) {
    setSlotsLoading(true);
    try {
      const now = new Date();
      const thisMonday = getWeekMonday(now);
      const nextMondayDate = new Date(thisMonday + "T00:00:00");
      nextMondayDate.setDate(nextMondayDate.getDate() + 7);
      const nextMonday = nextMondayDate.toISOString().split("T")[0];

      const [thisWeekRes, nextWeekRes] = await Promise.all([
        fetch(`/api/slots/fill?week=${thisMonday}`),
        fetch(`/api/slots/fill?week=${nextMonday}`),
      ]);

      const thisWeekData: SlotFill[] = await thisWeekRes.json();
      const nextWeekData: SlotFill[] = await nextWeekRes.json();

      const thisWeekStart = new Date(thisMonday + "T00:00:00");
      const nextWeekStart = new Date(nextMonday + "T00:00:00");

      const addDates = (slots: SlotFill[], weekStart: Date): SlotWithDate[] =>
        slots.map((s) => ({
          ...s,
          dayDate: getDateForDay(weekStart, s.dayOfWeek),
        }));

      const allSlots = [
        ...addDates(thisWeekData, thisWeekStart),
        ...addDates(nextWeekData, nextWeekStart),
      ];

      // Filter: matching platform, not full, not in the past
      const filtered = allSlots.filter((slot) => {
        if (slot.platform !== platform) return false;
        if (slot.filledCount >= slot.targetCount) return false;
        const slotEnd = new Date(slot.dayDate);
        slotEnd.setHours(slot.endHour, 0, 0, 0);
        if (slotEnd <= now) return false;
        return true;
      });

      // Sort by date then startHour
      filtered.sort((a, b) => {
        const dateA = a.dayDate.getTime() + a.startHour * 60;
        const dateB = b.dayDate.getTime() + b.startHour * 60;
        return dateA - dateB;
      });

      setSlotsData(filtered);
    } catch (err) {
      console.error("Failed to fetch slots:", err);
      setSlotsData([]);
    } finally {
      setSlotsLoading(false);
    }
  }

  function openScheduleDialog(draft: Draft) {
    setScheduleDraft(draft);
    setScheduleDate("");
    setScheduleTime("");
    setScheduleTab("slots");
    setSlotsData([]);
    setSlotScheduling(null);
    setScheduleOpen(true);
    fetchSlots(draft.platform);
  }

  async function handleScheduleFromSlot(slot: SlotWithDate) {
    if (!scheduleDraft) return;
    setSlotScheduling(slot.slotId);
    try {
      const now = new Date();
      let scheduledTime = pickTimeInSlotClientSide(
        slot.dayDate,
        slot.startHour,
        slot.endHour,
      );
      // If the picked time is in the past, push to at least 5 min from now
      if (scheduledTime <= now) {
        scheduledTime = new Date(now.getTime() + 5 * 60 * 1000);
      }
      await fetch("/api/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: scheduleDraft.id,
          platform: scheduleDraft.platform,
          scheduledAt: scheduledTime.toISOString(),
        }),
      });
      setScheduleOpen(false);
      setScheduleDraft(null);
      fetchDrafts();
    } finally {
      setSlotScheduling(null);
    }
  }

  async function handleSchedule() {
    if (!scheduleDraft || !scheduleDate || !scheduleTime) return;
    const scheduledAt = new Date(
      `${scheduleDate}T${scheduleTime}`
    ).toISOString();
    await fetch("/api/scheduler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftId: scheduleDraft.id,
        platform: scheduleDraft.platform,
        scheduledAt,
      }),
    });
    setScheduleOpen(false);
    setScheduleDraft(null);
    fetchDrafts();
  }

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  async function handleDelete(draft: Draft) {
    await fetch(`/api/drafts/${draft.id}`, { method: "DELETE" });
    fetchDrafts();
  }

  // -------------------------------------------------------------------------
  // Tag toggle helpers
  // -------------------------------------------------------------------------

  function toggleTag(
    current: string[],
    tag: string,
    setter: (v: string[]) => void
  ) {
    setter(
      current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag]
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Draft Workshop</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Review, edit, and schedule content drafts
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Draft
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Draft</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {/* Content */}
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  placeholder="Write your draft content..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Platform */}
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={newPlatform} onValueChange={setNewPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="X">X</SelectItem>
                    <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                    <SelectItem value="Article">Article</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Lanes */}
              <div className="space-y-2">
                <Label>Lanes</Label>
                <div className="flex flex-wrap gap-2">
                  {LANES.map((lane) => (
                    <Badge
                      key={lane}
                      className={cn(
                        "cursor-pointer transition-opacity",
                        newLanes.includes(lane)
                          ? LANE_COLORS[lane]
                          : "bg-zinc-800 text-zinc-500 border-zinc-700 opacity-50"
                      )}
                      onClick={() => toggleTag(newLanes, lane, setNewLanes)}
                    >
                      {lane}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Products */}
              <div className="space-y-2">
                <Label>Products</Label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCTS.map((product) => (
                    <Badge
                      key={product}
                      variant="outline"
                      className={cn(
                        "cursor-pointer transition-opacity",
                        newProducts.includes(product)
                          ? "bg-zinc-700 text-zinc-100 border-zinc-600"
                          : "text-zinc-500 border-zinc-700 opacity-50"
                      )}
                      onClick={() =>
                        toggleTag(newProducts, product, setNewProducts)
                      }
                    >
                      {product}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Suggested Time */}
              <div className="space-y-2">
                <Label>Suggested Time</Label>
                <Input
                  type="datetime-local"
                  value={newSuggestedTime}
                  onChange={(e) => setNewSuggestedTime(e.target.value)}
                />
              </div>

              <Separator />

              {/* Thread toggle */}
              <div className="flex items-center gap-3">
                <Label>Thread (multi-part)</Label>
                <Button
                  variant={newIsThread ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => {
                    setNewIsThread(!newIsThread);
                    if (!newIsThread) setNewThreadParts([""]);
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1" />
                  {newIsThread ? "Thread On" : "Thread Off"}
                </Button>
              </div>

              {/* Thread Parts */}
              {newIsThread && (
                <div className="space-y-3">
                  <Label>Thread Parts</Label>
                  {newThreadParts.map((part, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="flex-shrink-0 mt-2 text-xs font-mono text-zinc-500 w-6 text-right">
                        {idx + 1}.
                      </span>
                      <Textarea
                        placeholder={`Part ${idx + 1}...`}
                        value={part}
                        onChange={(e) => {
                          const updated = [...newThreadParts];
                          updated[idx] = e.target.value;
                          setNewThreadParts(updated);
                        }}
                        rows={2}
                        className="flex-1"
                      />
                      {newThreadParts.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0 mt-1"
                          onClick={() =>
                            setNewThreadParts(
                              newThreadParts.filter((_, i) => i !== idx)
                            )
                          }
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setNewThreadParts([...newThreadParts, ""])
                    }
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Part
                  </Button>
                </div>
              )}

              <Separator />

              {/* Variations */}
              <div className="space-y-3">
                <Label>Variations (A/B)</Label>
                {newVariations.map((variation, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="flex-shrink-0 mt-2 text-xs font-mono text-zinc-500 w-6 text-right">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <Textarea
                      placeholder={`Variation ${String.fromCharCode(65 + idx)}...`}
                      value={variation}
                      onChange={(e) => {
                        const updated = [...newVariations];
                        updated[idx] = e.target.value;
                        setNewVariations(updated);
                      }}
                      rows={2}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 mt-1"
                      onClick={() =>
                        setNewVariations(
                          newVariations.filter((_, i) => i !== idx)
                        )
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewVariations([...newVariations, ""])}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Variation
                </Button>
              </div>

              <Separator />

              {/* Attachments */}
              <div className="space-y-3">
                <Label>Attachments</Label>
                {newAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newAttachments.map((att, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="gap-1.5 text-zinc-300 border-zinc-700"
                      >
                        <Paperclip className="h-3 w-3" />
                        {att}
                        <button
                          onClick={() =>
                            setNewAttachments(
                              newAttachments.filter((_, i) => i !== idx)
                            )
                          }
                          className="ml-0.5 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="Filename (e.g. screenshot.png)"
                    value={newAttachmentInput}
                    onChange={(e) => setNewAttachmentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newAttachmentInput.trim()) {
                        setNewAttachments([
                          ...newAttachments,
                          newAttachmentInput.trim(),
                        ]);
                        setNewAttachmentInput("");
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!newAttachmentInput.trim()}
                    onClick={() => {
                      if (newAttachmentInput.trim()) {
                        setNewAttachments([
                          ...newAttachments,
                          newAttachmentInput.trim(),
                        ]);
                        setNewAttachmentInput("");
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  resetCreateForm();
                  setCreateOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newContent.trim() && !newIsThread}
              >
                <FileText className="h-4 w-4 mr-1" />
                Create Draft
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Filter Tabs */}
      <Tabs
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as DraftStatus)}
      >
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Drafts Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-zinc-500">Loading drafts...</p>
        </div>
      ) : drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="h-10 w-10 text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-400">
            {statusFilter === "all"
              ? "No drafts yet. Create one to get started."
              : `No ${statusFilter} drafts.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onEdit={() => openEditDialog(draft)}
              onApprove={() => handleApprove(draft)}
              onReject={() => openRejectDialog(draft)}
              onSchedule={() => openScheduleDialog(draft)}
              onDelete={() => handleDelete(draft)}
            />
          ))}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Edit / Review Dialog                                              */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Draft</DialogTitle>
          </DialogHeader>
          {editDraft && (
            <div className="space-y-4 mt-2">
              {/* Content */}
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Platform */}
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={editPlatform} onValueChange={setEditPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="X">X</SelectItem>
                    <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                    <SelectItem value="Article">Article</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Lanes */}
              <div className="space-y-2">
                <Label>Lanes</Label>
                <div className="flex flex-wrap gap-2">
                  {LANES.map((lane) => (
                    <Badge
                      key={lane}
                      className={cn(
                        "cursor-pointer transition-opacity",
                        editLanes.includes(lane)
                          ? LANE_COLORS[lane]
                          : "bg-zinc-800 text-zinc-500 border-zinc-700 opacity-50"
                      )}
                      onClick={() =>
                        toggleTag(editLanes, lane, setEditLanes)
                      }
                    >
                      {lane}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Products */}
              <div className="space-y-2">
                <Label>Products</Label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCTS.map((product) => (
                    <Badge
                      key={product}
                      variant="outline"
                      className={cn(
                        "cursor-pointer transition-opacity",
                        editProducts.includes(product)
                          ? "bg-zinc-700 text-zinc-100 border-zinc-600"
                          : "text-zinc-500 border-zinc-700 opacity-50"
                      )}
                      onClick={() =>
                        toggleTag(editProducts, product, setEditProducts)
                      }
                    >
                      {product}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Thread toggle */}
              <div className="flex items-center gap-3">
                <Label>Thread (multi-part)</Label>
                <Button
                  variant={editIsThread ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => {
                    setEditIsThread(!editIsThread);
                    if (!editIsThread) setEditThreadParts([""]);
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1" />
                  {editIsThread ? "Thread On" : "Thread Off"}
                </Button>
              </div>

              {/* Thread Parts */}
              {editIsThread && (
                <div className="space-y-3">
                  <Label>Thread Parts</Label>
                  {editThreadParts.map((part, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="flex-shrink-0 mt-2 text-xs font-mono text-zinc-500 w-6 text-right">
                        {idx + 1}.
                      </span>
                      <Textarea
                        placeholder={`Part ${idx + 1}...`}
                        value={part}
                        onChange={(e) => {
                          const updated = [...editThreadParts];
                          updated[idx] = e.target.value;
                          setEditThreadParts(updated);
                        }}
                        rows={2}
                        className="flex-1"
                      />
                      {editThreadParts.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0 mt-1"
                          onClick={() =>
                            setEditThreadParts(
                              editThreadParts.filter((_, i) => i !== idx)
                            )
                          }
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditThreadParts([...editThreadParts, ""])
                    }
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Part
                  </Button>
                </div>
              )}

              <Separator />

              {/* Variations */}
              <div className="space-y-3">
                <Label>Variations (A/B)</Label>
                {editVariations.map((variation, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="flex-shrink-0 mt-2 text-xs font-mono text-zinc-500 w-6 text-right">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <Textarea
                      placeholder={`Variation ${String.fromCharCode(65 + idx)}...`}
                      value={variation}
                      onChange={(e) => {
                        const updated = [...editVariations];
                        updated[idx] = e.target.value;
                        setEditVariations(updated);
                      }}
                      rows={2}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 mt-1"
                      onClick={() =>
                        setEditVariations(
                          editVariations.filter((_, i) => i !== idx)
                        )
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditVariations([...editVariations, ""])
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Variation
                </Button>
              </div>

              <Separator />

              {/* Attachments */}
              <div className="space-y-3">
                <Label>Attachments</Label>
                {editAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editAttachments.map((att, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="gap-1.5 text-zinc-300 border-zinc-700"
                      >
                        <Paperclip className="h-3 w-3" />
                        {att}
                        <button
                          onClick={() =>
                            setEditAttachments(
                              editAttachments.filter((_, i) => i !== idx)
                            )
                          }
                          className="ml-0.5 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="Filename (e.g. screenshot.png)"
                    value={editAttachmentInput}
                    onChange={(e) => setEditAttachmentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && editAttachmentInput.trim()) {
                        setEditAttachments([
                          ...editAttachments,
                          editAttachmentInput.trim(),
                        ]);
                        setEditAttachmentInput("");
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!editAttachmentInput.trim()}
                    onClick={() => {
                      if (editAttachmentInput.trim()) {
                        setEditAttachments([
                          ...editAttachments,
                          editAttachmentInput.trim(),
                        ]);
                        setEditAttachmentInput("");
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Rejection note (read-only if present) */}
              {editDraft.rejectionNote && (
                <div className="space-y-2">
                  <Label className="text-red-400">Rejection Note</Label>
                  <p className="text-sm text-red-400/80 bg-red-500/10 rounded-md p-3 border border-red-500/20">
                    {editDraft.rejectionNote}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>
              <Check className="h-4 w-4 mr-1" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------- */}
      {/* Rejection Dialog                                                   */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Draft</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {rejectDraft && (
              <p className="text-sm text-zinc-400">
                Rejecting: &ldquo;{truncate(rejectDraft.content, 80)}&rdquo;
              </p>
            )}
            <div className="space-y-2">
              <Label>Rejection Note</Label>
              <Textarea
                placeholder="Why is this draft being rejected? Any feedback for revision..."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              <X className="h-4 w-4 mr-1" />
              Reject Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------- */}
      {/* Schedule Dialog                                                    */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Draft</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {scheduleDraft && (
              <p className="text-sm text-zinc-400">
                Scheduling for{" "}
                <span className="text-zinc-200 font-medium">
                  {scheduleDraft.platform}
                </span>
                : &ldquo;{truncate(scheduleDraft.content, 80)}&rdquo;
              </p>
            )}

            <Tabs value={scheduleTab} onValueChange={(v) => setScheduleTab(v as "slots" | "custom")}>
              <TabsList className="w-full">
                <TabsTrigger value="slots" className="flex-1">
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  Available Slots
                </TabsTrigger>
                <TabsTrigger value="custom" className="flex-1">
                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                  Custom Time
                </TabsTrigger>
              </TabsList>

              {/* Available Slots Tab */}
              <TabsContent value="slots" className="mt-4">
                {slotsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 text-zinc-500 animate-spin" />
                    <span className="ml-2 text-sm text-zinc-500">Loading slots...</span>
                  </div>
                ) : slotsData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Calendar className="h-8 w-8 text-zinc-600 mb-2" />
                    <p className="text-sm text-zinc-400">
                      No available slots for {scheduleDraft?.platform ?? "this platform"}.
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Try the Custom Time tab or configure slots in the Planner.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
                    {(() => {
                      // Group by day
                      const grouped = new Map<string, SlotWithDate[]>();
                      for (const slot of slotsData) {
                        const key = slot.dayDate.toISOString().split("T")[0];
                        if (!grouped.has(key)) grouped.set(key, []);
                        grouped.get(key)!.push(slot);
                      }
                      return Array.from(grouped.entries()).map(([dayKey, daySlots]) => (
                        <div key={dayKey}>
                          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                            {formatSlotDay(daySlots[0].dayDate)}
                          </h4>
                          <div className="space-y-1.5">
                            {daySlots.map((slot) => {
                              const remaining = slot.targetCount - slot.filledCount;
                              const blockLabel = TIME_BLOCK_LABELS[slot.timeBlock] ?? slot.timeBlock;
                              const hourDisplay = `${slot.startHour > 12 ? slot.startHour - 12 : slot.startHour}${slot.startHour >= 12 ? "pm" : "am"}–${slot.endHour > 12 ? slot.endHour - 12 : slot.endHour}${slot.endHour >= 12 ? "pm" : "am"}`;
                              return (
                                <button
                                  key={slot.slotId + dayKey}
                                  disabled={slotScheduling !== null}
                                  onClick={() => handleScheduleFromSlot(slot)}
                                  className={cn(
                                    "w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                                    "border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800/80",
                                    slotScheduling === slot.slotId && "opacity-70 pointer-events-none"
                                  )}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-sm text-zinc-200 font-medium">
                                        {blockLabel}
                                      </span>
                                      <span className="text-xs text-zinc-500">
                                        {hourDisplay}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-700">
                                      {slot.platform}
                                    </Badge>
                                    <span className={cn(
                                      "text-xs",
                                      remaining > 1 ? "text-green-400" : "text-amber-400"
                                    )}>
                                      {slot.filledCount}/{slot.targetCount} filled
                                    </span>
                                    {slotScheduling === slot.slotId ? (
                                      <Loader2 className="h-3.5 w-3.5 text-zinc-400 animate-spin" />
                                    ) : (
                                      <Send className="h-3.5 w-3.5 text-zinc-500" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </TabsContent>

              {/* Custom Time Tab */}
              <TabsContent value="custom" className="mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button variant="ghost" onClick={() => setScheduleOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSchedule}
                    disabled={!scheduleDate || !scheduleTime}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Schedule
                  </Button>
                </DialogFooter>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draft Card Component
// ---------------------------------------------------------------------------

function DraftCard({
  draft,
  onEdit,
  onApprove,
  onReject,
  onSchedule,
  onDelete,
}: {
  draft: Draft;
  onEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onSchedule: () => void;
  onDelete: () => void;
}) {
  const lanes = parseJSON<string[]>(draft.lanes, []);
  const products = parseJSON<string[]>(draft.products, []);
  const variations = parseJSON<string[]>(draft.variations, []);
  const threadParts = parseJSON<string[]>(draft.threadParts, []);
  const attachments = parseJSON<string[]>(draft.attachments, []);

  const hasVariations = variations.length > 0;
  const hasThread = draft.isThread && threadParts.length > 0;
  const hasAttachments = attachments.length > 0;

  return (
    <Card className="border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn("text-xs", STATUS_COLORS[draft.status])}>
              {draft.status}
            </Badge>
            <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-700">
              {draft.platform}
            </Badge>
            {hasThread && (
              <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-700">
                <MessageSquare className="h-3 w-3 mr-1" />
                Thread ({threadParts.length})
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-500 hover:text-red-400 flex-shrink-0"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Content Preview / Variations */}
        {hasVariations ? (
          <Tabs defaultValue="main" className="w-full">
            <TabsList className="h-7 p-0.5">
              <TabsTrigger value="main" className="text-xs h-6 px-2">
                Main
              </TabsTrigger>
              {variations.map((_, idx) => (
                <TabsTrigger
                  key={idx}
                  value={`var-${idx}`}
                  className="text-xs h-6 px-2"
                >
                  {String.fromCharCode(65 + idx)}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="main">
              <ContentPreview
                content={draft.content}
                isThread={hasThread}
                threadParts={threadParts}
              />
            </TabsContent>
            {variations.map((variation, idx) => (
              <TabsContent key={idx} value={`var-${idx}`}>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {truncate(variation, 280)}
                </p>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <ContentPreview
            content={draft.content}
            isThread={hasThread}
            threadParts={threadParts}
          />
        )}

        {/* Attachments */}
        {hasAttachments && (
          <div className="flex flex-wrap gap-1.5">
            {attachments.map((att, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="text-xs text-zinc-400 border-zinc-700 gap-1"
              >
                <Paperclip className="h-3 w-3" />
                {att}
              </Badge>
            ))}
          </div>
        )}

        {/* Tags */}
        {(lanes.length > 0 || products.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {lanes.map((lane) => (
              <Badge
                key={lane}
                className={cn("text-xs", LANE_COLORS[lane])}
              >
                {lane}
              </Badge>
            ))}
            {products.map((product) => (
              <Badge
                key={product}
                variant="outline"
                className="text-xs text-zinc-400 border-zinc-700"
              >
                {product}
              </Badge>
            ))}
          </div>
        )}

        {/* Suggested time */}
        {draft.suggestedTime && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Clock className="h-3 w-3" />
            <span>{formatDateTime(draft.suggestedTime)}</span>
          </div>
        )}

        {/* Rejection note */}
        {draft.rejectionNote && (
          <p className="text-xs text-red-400/80 bg-red-500/10 rounded px-2 py-1.5 border border-red-500/20">
            {draft.rejectionNote}
          </p>
        )}

        {/* Meta */}
        <div className="text-xs text-zinc-600">
          Created {formatDate(draft.createdAt)}
        </div>

        <Separator className="bg-zinc-800" />

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onEdit}>
            <FileText className="h-3 w-3 mr-1" />
            Edit
          </Button>
          {(draft.status === "draft" || draft.status === "rejected") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10"
              onClick={onApprove}
            >
              <Check className="h-3 w-3 mr-1" />
              Approve
            </Button>
          )}
          {(draft.status === "draft" || draft.status === "approved") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
              onClick={onSchedule}
            >
              <Clock className="h-3 w-3 mr-1" />
              Schedule
            </Button>
          )}
          {draft.status === "draft" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={onReject}
            >
              <X className="h-3 w-3 mr-1" />
              Reject
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Content Preview (with thread support)
// ---------------------------------------------------------------------------

function ContentPreview({
  content,
  isThread,
  threadParts,
}: {
  content: string;
  isThread: boolean;
  threadParts: string[];
}) {
  if (isThread && threadParts.length > 0) {
    return (
      <div className="space-y-2">
        {threadParts.map((part, idx) => (
          <div
            key={idx}
            className="flex gap-2 text-sm"
          >
            <span className="flex-shrink-0 font-mono text-xs text-zinc-600 mt-0.5 w-5 text-right">
              {idx + 1}.
            </span>
            <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {truncate(part, 200)}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
      {truncate(content, 280)}
    </p>
  );
}
