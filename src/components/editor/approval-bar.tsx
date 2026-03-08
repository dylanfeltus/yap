"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Check, X, CalendarDays, Loader2 } from "lucide-react";

interface ApprovalBarProps {
  draftId: string;
  status: string;
  platform: string;
  onStatusChange: (newStatus: string) => void;
  onClose?: () => void;
}

export function ApprovalBar({
  draftId,
  status,
  platform,
  onStatusChange,
  onClose,
}: ApprovalBarProps) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    setLoading(true);
    try {
      const res = await fetch(`/api/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      onStatusChange("approved");
    } catch {
      // Error handled silently — status won't change on failure
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    setLoading(true);
    try {
      const res = await fetch(`/api/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", rejectionNote: rejectNote }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      setRejectOpen(false);
      onStatusChange("rejected");
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }

  async function handleSchedule() {
    if (!scheduleDate || !scheduleTime) return;
    setLoading(true);
    try {
      const scheduledAt = new Date(
        `${scheduleDate}T${scheduleTime}`
      ).toISOString();

      // Create scheduled post
      const res = await fetch("/api/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, platform, scheduledAt }),
      });
      if (!res.ok) throw new Error("Failed to schedule");

      // Update draft status
      await fetch(`/api/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "scheduled" }),
      });

      setScheduleOpen(false);
      onStatusChange("scheduled");
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }

  const canApprove = status === "draft" || status === "rejected";
  const canReject = status === "draft";
  const canSchedule = status === "draft" || status === "approved";

  return (
    <>
      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Status:</span>
          <Badge className={cn("text-xs", STATUS_COLORS[status])}>
            {status}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
          {canReject && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-400 border-red-500/30 hover:bg-red-500/10"
              onClick={() => setRejectOpen(true)}
              disabled={loading}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Reject
            </Button>
          )}
          {canSchedule && (
            <Button
              variant="outline"
              size="sm"
              className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
              onClick={() => setScheduleOpen(true)}
              disabled={loading}
            >
              <CalendarDays className="h-3.5 w-3.5 mr-1" />
              Schedule
            </Button>
          )}
          {canApprove && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApprove}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5 mr-1" />
              )}
              Approve
            </Button>
          )}
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Draft</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Label>Reason for rejection</Label>
            <Textarea
              placeholder="Feedback for revision..."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
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
              disabled={!scheduleDate || !scheduleTime || loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CalendarDays className="h-4 w-4 mr-1" />
              )}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
