"use client";

import { useEffect, useState, useCallback } from "react";
import { cn, STATUS_COLORS, parseJSON } from "@/lib/utils";
import { Draft } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Clock,
  Send,
  MessageSquare,
  Bot,
  FileText,
  Loader2,
} from "lucide-react";
import { DraftEditor } from "@/components/editor/draft-editor";

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatScheduledTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

interface ScheduledPostWithDraft {
  id: string;
  draftId: string;
  platform: string;
  scheduledAt: string;
  postedAt: string | null;
  status: string;
  draft?: Draft;
}

export default function ApprovePage() {
  const [pendingDrafts, setPendingDrafts] = useState<Draft[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPostWithDraft[]>([]);
  const [recentlyPosted, setRecentlyPosted] = useState<ScheduledPostWithDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [draftsRes, schedulerRes] = await Promise.all([
        fetch("/api/drafts"),
        fetch("/api/scheduler"),
      ]);

      if (!draftsRes.ok || !schedulerRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const allDrafts: Draft[] = await draftsRes.json();
      const allScheduled: ScheduledPostWithDraft[] = await schedulerRes.json();

      setPendingDrafts(
        allDrafts
          .filter((d) => d.status === "draft")
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
      );

      setScheduledPosts(
        allScheduled
          .filter((p) => p.status === "queued")
          .sort(
            (a, b) =>
              new Date(a.scheduledAt).getTime() -
              new Date(b.scheduledAt).getTime()
          )
      );

      setRecentlyPosted(
        allScheduled
          .filter((p) => p.status === "posted")
          .sort(
            (a, b) =>
              new Date(b.postedAt ?? b.scheduledAt).getTime() -
              new Date(a.postedAt ?? a.scheduledAt).getTime()
          )
          .slice(0, 10)
      );
    } catch {
      // Data fetch failed — lists remain empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleOpenEditor(draft: Draft) {
    setEditingDraft(draft);
  }

  function handleEditorClose() {
    setEditingDraft(null);
    fetchData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Approval Queue</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Review agent-generated drafts, approve or reject, and manage scheduled posts
        </p>
      </div>

      {/* Pending Review */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-yellow-400" />
          <h2 className="text-sm font-semibold text-zinc-200">
            Pending Review
          </h2>
          {pendingDrafts.length > 0 && (
            <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">
              {pendingDrafts.length}
            </Badge>
          )}
        </div>
        {pendingDrafts.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500/40 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">All caught up — nothing to review</p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {pendingDrafts.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                onClick={() => handleOpenEditor(draft)}
              />
            ))}
          </div>
        )}
      </section>

      <Separator className="bg-zinc-800" />

      {/* Scheduled */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Scheduled</h2>
          {scheduledPosts.length > 0 && (
            <Badge className="bg-blue-500/20 text-blue-400 text-xs">
              {scheduledPosts.length}
            </Badge>
          )}
        </div>
        {scheduledPosts.length === 0 ? (
          <p className="text-sm text-zinc-500 py-4">No posts scheduled</p>
        ) : (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {scheduledPosts.map((post) => (
              <ScheduledCard
                key={post.id}
                post={post}
                onClick={() => {
                  if (post.draft) handleOpenEditor(post.draft);
                }}
              />
            ))}
          </div>
        )}
      </section>

      <Separator className="bg-zinc-800" />

      {/* Recently Posted */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-green-400" />
          <h2 className="text-sm font-semibold text-zinc-200">
            Recently Posted
          </h2>
        </div>
        {recentlyPosted.length === 0 ? (
          <p className="text-sm text-zinc-500 py-4">No posts yet</p>
        ) : (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {recentlyPosted.map((post) => (
              <ScheduledCard key={post.id} post={post} posted />
            ))}
          </div>
        )}
      </section>

      {/* Editor Dialog */}
      <Dialog
        open={editingDraft !== null}
        onOpenChange={(open) => {
          if (!open) handleEditorClose();
        }}
      >
        <DialogContent className="w-full max-w-[95vw] h-[100dvh] p-0 gap-0 flex flex-col sm:h-[85vh] sm:max-w-3xl">
          {editingDraft && (
            <DraftEditor
              draft={editingDraft}
              onClose={handleEditorClose}
              onSaved={fetchData}
              onStatusChange={() => {
                fetchData();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draft Card
// ---------------------------------------------------------------------------

function DraftCard({
  draft,
  onClick,
}: {
  draft: Draft;
  onClick: () => void;
}) {
  const threadParts = parseJSON<string[]>(draft.threadParts, []);
  const isThread = draft.isThread && threadParts.length > 1;

  return (
    <Card
      className="border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-[10px] text-zinc-400 border-zinc-700"
          >
            {draft.platform}
          </Badge>
          {isThread && (
            <Badge
              variant="outline"
              className="text-[10px] text-zinc-400 border-zinc-700"
            >
              <MessageSquare className="h-2.5 w-2.5 mr-0.5" />
              {threadParts.length} parts
            </Badge>
          )}
          <span className="ml-auto" aria-label="Agent-created">
            <Bot className="h-3 w-3 text-zinc-600" />
          </span>
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed">
          {truncate(draft.content, 140)}
        </p>
        <p className="text-[10px] text-zinc-600">
          {formatRelativeTime(draft.createdAt)}
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Scheduled Card
// ---------------------------------------------------------------------------

function ScheduledCard({
  post,
  onClick,
  posted,
}: {
  post: ScheduledPostWithDraft;
  onClick?: () => void;
  posted?: boolean;
}) {
  const content = post.draft?.content ?? "No content";

  return (
    <Card
      className={cn(
        "border-zinc-800 bg-zinc-900 transition-colors",
        onClick && "hover:border-zinc-700 cursor-pointer"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-[10px] text-zinc-400 border-zinc-700"
          >
            {post.platform}
          </Badge>
          <Badge
            className={cn(
              "text-[10px]",
              posted ? STATUS_COLORS["posted"] : STATUS_COLORS["scheduled"]
            )}
          >
            {posted ? "posted" : "scheduled"}
          </Badge>
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed">
          {truncate(content, 140)}
        </p>
        <p className="text-[10px] text-zinc-500">
          {posted ? "Posted" : "Scheduled for"}{" "}
          {formatScheduledTime(post.scheduledAt)}
        </p>
      </CardContent>
    </Card>
  );
}
