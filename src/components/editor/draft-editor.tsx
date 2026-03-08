"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Draft, PLATFORM_LIMITS } from "@/lib/types";
import { parseJSON } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThreadPreview } from "./thread-preview";
import { ApprovalBar } from "./approval-bar";
import { MediaUpload } from "./media-upload";
import { Save, Loader2 } from "lucide-react";

interface DraftEditorProps {
  draft: Draft;
  onClose?: () => void;
  onSaved?: () => void;
  onStatusChange?: (newStatus: string) => void;
}

function splitThreadParts(content: string): string[] {
  const parts = content.split(/\n---\n/).map((p) => p.trim());
  return parts.filter((p) => p.length > 0);
}

function isThreadContent(content: string): boolean {
  return /\n---\n/.test(content);
}

export function DraftEditor({
  draft,
  onClose,
  onSaved,
  onStatusChange,
}: DraftEditorProps) {
  const [content, setContent] = useState(draft.content);
  const [platform, setPlatform] = useState(draft.platform);
  const [status, setStatus] = useState(draft.status);
  const [attachments, setAttachments] = useState<string[]>(
    parseJSON<string[]>(draft.attachments, [])
  );
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(content);
  const platformRef = useRef(platform);
  const attachmentsRef = useRef(attachments);

  // Keep refs in sync
  contentRef.current = content;
  platformRef.current = platform;
  attachmentsRef.current = attachments;

  const limit = PLATFORM_LIMITS[platform] ?? 280;
  const isThread = isThreadContent(content);
  const threadParts = isThread ? splitThreadParts(content) : [];
  const charCount = isThread ? 0 : content.length;
  const ratio = charCount / limit;
  const isWarning = !isThread && ratio >= 0.9 && ratio < 1;
  const isOver = !isThread && ratio >= 1;

  // Auto-save with debounce
  const saveToApi = useCallback(async () => {
    setSaving(true);
    try {
      const currentContent = contentRef.current;
      const currentPlatform = platformRef.current;
      const thread = isThreadContent(currentContent);
      const parts = thread ? splitThreadParts(currentContent) : [];

      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: currentContent,
          platform: currentPlatform,
          isThread: thread,
          threadParts: parts,
          attachments: attachmentsRef.current,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setLastSaved(new Date());
      onSaved?.();
    } catch {
      // Save failed silently — user sees no "saved" indicator update
    } finally {
      setSaving(false);
    }
  }, [draft.id, onSaved]);

  function triggerAutoSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveToApi, 3000);
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        // Approve shortcut — only if draft/rejected
        if (status === "draft" || status === "rejected") {
          handleStatusChange("approved");
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveToApi();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, saveToApi, onClose]);

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    onStatusChange?.(newStatus);

    // Persist to backend
    if (draft?.id) {
      try {
        await fetch(`/api/drafts/${draft.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
      } catch {
        // Revert on failure
        setStatus(status);
      }
    }
  }

  function handleContentChange(value: string) {
    setContent(value);
    triggerAutoSave();
  }

  function handleAttachmentsChange(value: string[]) {
    setAttachments(value);
    triggerAutoSave();
  }

  function handlePlatformChange(value: string) {
    setPlatform(value);
    triggerAutoSave();
  }

  // Existing thread parts from DB (for initial display)
  const existingThreadParts = parseJSON<string[]>(draft.threadParts, []);
  const hasExistingThread =
    draft.isThread && existingThreadParts.length > 0 && !isThread;

  return (
    <div className="flex flex-col h-full">
      {/* Editor header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Select value={platform} onValueChange={handlePlatformChange}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="X">X</SelectItem>
              <SelectItem value="LinkedIn">LinkedIn</SelectItem>
            </SelectContent>
          </Select>

          {draft.rejectionNote && (
            <Badge
              variant="outline"
              className="text-xs text-red-400 border-red-500/30"
            >
              Previously rejected
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {saving && (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
          {!saving && lastSaved && (
            <span className="flex items-center gap-1">
              <Save className="h-3 w-3" />
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Rejection note banner */}
      {draft.rejectionNote && (
        <div className="mx-4 mt-3 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2">
          <p className="text-xs text-red-400">
            <span className="font-medium">Rejection note:</span>{" "}
            {draft.rejectionNote}
          </p>
        </div>
      )}

      {/* Main editor area */}
      <div className="flex-1 overflow-y-auto">
        <div
          className={cn(
            "grid gap-4 p-4",
            isThread || hasExistingThread
              ? "grid-cols-1 lg:grid-cols-2"
              : "grid-cols-1"
          )}
        >
          {/* Editor */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-400">
                  Content{" "}
                  {isThread && (
                    <span className="text-zinc-500">
                      (use --- on its own line to split into thread)
                    </span>
                  )}
                </Label>
                {!isThread && (
                  <span
                    className={cn(
                      "text-xs font-mono",
                      isOver
                        ? "text-red-400"
                        : isWarning
                          ? "text-yellow-400"
                          : "text-zinc-500"
                    )}
                  >
                    {charCount}/{limit}
                  </span>
                )}
              </div>
              <Textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Write your content here... Use --- on its own line to create a thread."
                className={cn(
                  "min-h-[300px] resize-none font-mono text-sm leading-relaxed",
                  isOver && "border-red-500/50 focus-visible:ring-red-500/30",
                  isWarning &&
                    "border-yellow-500/50 focus-visible:ring-yellow-500/30"
                )}
              />
              {isOver && (
                <p className="text-xs text-red-400">
                  Over the {limit} character limit for {platform}
                </p>
              )}
            </div>

            {/* Media upload */}
            <MediaUpload
              attachments={attachments}
              onChange={handleAttachmentsChange}
            />

            {/* Thread hint */}
            {!isThread && !hasExistingThread && (
              <p className="text-[10px] text-zinc-600">
                Tip: Type --- on its own line to create a thread
              </p>
            )}
          </div>

          {/* Thread preview panel */}
          {isThread && (
            <div className="lg:border-l lg:border-zinc-800 lg:pl-4">
              <ThreadPreview parts={threadParts} platform={platform} attachments={attachments} />
            </div>
          )}

          {/* Existing thread parts (from DB, not inline) */}
          {hasExistingThread && !isThread && (
            <div className="lg:border-l lg:border-zinc-800 lg:pl-4">
              <ThreadPreview
                parts={existingThreadParts}
                platform={platform}
                attachments={attachments}
              />
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Approval bar */}
      <ApprovalBar
        draftId={draft.id}
        status={status}
        platform={platform}
        onStatusChange={handleStatusChange}
        onClose={onClose}
      />
    </div>
  );
}
