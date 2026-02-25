"use client";

import { useState, useEffect, useCallback } from "react";
import { cn, STATUS_COLORS, parseJSON } from "@/lib/utils";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MessageSquare,
  Copy,
  ExternalLink,
  Check,
  X,
  Plus,
  Trash2,
  User,
  Eye,
  EyeOff,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Engagement {
  likes: number;
  retweets: number;
  replies: number;
  views: number;
}

interface ReplyCandidate {
  id: string;
  externalPostId: string;
  authorHandle: string;
  authorName: string;
  content: string;
  engagement: string; // JSON
  platform: string;
  replySuggestions: string; // JSON
  status: string; // new | replied | skipped
  repliedAt: string | null;
  createdAt: string;
}

interface ReplyTarget {
  id: string;
  accountHandle: string;
  accountName: string;
  keywords: string; // JSON
  isActive: boolean;
  createdAt: string;
}

type StatusFilter = "new" | "replied" | "skipped";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RepliesPage() {
  // Candidates state
  const [candidates, setCandidates] = useState<ReplyCandidate[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("new");
  const [loadingCandidates, setLoadingCandidates] = useState(true);

  // Targets state
  const [targets, setTargets] = useState<ReplyTarget[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(true);

  // Add target dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [newName, setNewName] = useState("");
  const [newKeywords, setNewKeywords] = useState("");

  // Clipboard feedback: maps `candidateId-suggestionIndex` to true while showing "Copied!"
  const [copiedKeys, setCopiedKeys] = useState<Record<string, boolean>>({});

  // -------------------------------------------------------------------------
  // Fetch helpers
  // -------------------------------------------------------------------------

  const fetchCandidates = useCallback(async () => {
    setLoadingCandidates(true);
    try {
      const res = await fetch(
        `/api/replies/candidates?status=${statusFilter}`
      );
      if (res.ok) {
        const data: ReplyCandidate[] = await res.json();
        setCandidates(data);
      }
    } finally {
      setLoadingCandidates(false);
    }
  }, [statusFilter]);

  const fetchTargets = useCallback(async () => {
    setLoadingTargets(true);
    try {
      const res = await fetch("/api/replies/targets");
      if (res.ok) {
        const data: ReplyTarget[] = await res.json();
        setTargets(data);
      }
    } finally {
      setLoadingTargets(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  // -------------------------------------------------------------------------
  // Candidate actions
  // -------------------------------------------------------------------------

  async function updateCandidateStatus(id: string, status: string) {
    const res = await fetch(`/api/replies/candidates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setCandidates((prev) => prev.filter((c) => c.id !== id));
    }
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKeys((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedKeys((prev) => ({ ...prev, [key]: false }));
    }, 1500);
  }

  // -------------------------------------------------------------------------
  // Target actions
  // -------------------------------------------------------------------------

  async function addTarget() {
    if (!newHandle.trim()) return;
    const res = await fetch("/api/replies/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountHandle: newHandle.trim().replace(/^@/, ""),
        accountName: newName.trim(),
        keywords: newKeywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      }),
    });
    if (res.ok) {
      setAddDialogOpen(false);
      setNewHandle("");
      setNewName("");
      setNewKeywords("");
      fetchTargets();
    }
  }

  async function toggleTarget(target: ReplyTarget) {
    const res = await fetch(`/api/replies/targets/${target.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !target.isActive }),
    });
    if (res.ok) {
      setTargets((prev) =>
        prev.map((t) =>
          t.id === target.id ? { ...t, isActive: !t.isActive } : t
        )
      );
    }
  }

  async function deleteTarget(id: string) {
    const res = await fetch(`/api/replies/targets/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setTargets((prev) => prev.filter((t) => t.id !== id));
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const statusFilters: StatusFilter[] = ["new", "replied", "skipped"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Reply Guy
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Curate and copy reply suggestions for high-engagement posts.
          Copy/paste only — no automated posting.
        </p>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-6">
        {/* =============================================================== */}
        {/* LEFT PANEL — Candidates */}
        {/* =============================================================== */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Status filter tabs */}
          <div className="flex items-center gap-2">
            {statusFilters.map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter(s)}
                className="capitalize"
              >
                {s}
              </Button>
            ))}
          </div>

          {/* Candidate list */}
          {loadingCandidates ? (
            <p className="py-12 text-center text-sm text-zinc-500">
              Loading candidates...
            </p>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 py-16">
              <MessageSquare className="mb-3 h-8 w-8 text-zinc-600" />
              <p className="text-sm text-zinc-500">
                No {statusFilter} candidates found.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {candidates.map((candidate) => {
                const engagement = parseJSON<Engagement>(
                  candidate.engagement,
                  { likes: 0, retweets: 0, replies: 0, views: 0 }
                );
                const suggestions = parseJSON<string[]>(
                  candidate.replySuggestions,
                  []
                );

                return (
                  <Card
                    key={candidate.id}
                    className="border-zinc-800 bg-zinc-900"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        {/* Author info */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                            <User className="h-4 w-4 text-zinc-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zinc-200">
                              {candidate.authorName || candidate.authorHandle}
                            </p>
                            <p className="truncate text-xs text-zinc-500">
                              @{candidate.authorHandle}
                            </p>
                          </div>
                        </div>

                        {/* Status badge + actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] uppercase tracking-wider border-0",
                              STATUS_COLORS[candidate.status] ||
                                STATUS_COLORS.new
                            )}
                          >
                            {candidate.status}
                          </Badge>
                          <a
                            href={`https://x.com/${candidate.authorHandle}/status/${candidate.externalPostId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Post content */}
                      <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
                        {candidate.content}
                      </p>

                      {/* Engagement stats */}
                      <div className="flex flex-wrap gap-2">
                        {engagement.views > 0 && (
                          <Badge
                            variant="outline"
                            className="border-zinc-700 text-zinc-400 text-[11px]"
                          >
                            {engagement.views.toLocaleString()} views
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className="border-zinc-700 text-zinc-400 text-[11px]"
                        >
                          {engagement.likes.toLocaleString()} likes
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-zinc-700 text-zinc-400 text-[11px]"
                        >
                          {engagement.retweets.toLocaleString()} retweets
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-zinc-700 text-zinc-400 text-[11px]"
                        >
                          {engagement.replies.toLocaleString()} replies
                        </Badge>
                      </div>

                      {/* Reply suggestions */}
                      {suggestions.length > 0 && (
                        <>
                          <Separator className="bg-zinc-800" />
                          <div className="space-y-2">
                            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                              Reply Suggestions
                            </p>
                            <div className="space-y-2">
                              {suggestions.map((suggestion, idx) => {
                                const copyKey = `${candidate.id}-${idx}`;
                                return (
                                  <div
                                    key={idx}
                                    className="group flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3 transition-colors hover:border-zinc-700"
                                  >
                                    <p className="flex-1 text-sm text-zinc-300 leading-relaxed">
                                      {suggestion}
                                    </p>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() =>
                                        copyToClipboard(suggestion, copyKey)
                                      }
                                    >
                                      {copiedKeys[copyKey] ? (
                                        <Check className="h-3.5 w-3.5 text-green-400" />
                                      ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Action bar */}
                      <Separator className="bg-zinc-800" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {candidate.status === "new" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-zinc-400 hover:text-zinc-100"
                                onClick={() =>
                                  updateCandidateStatus(
                                    candidate.id,
                                    "skipped"
                                  )
                                }
                              >
                                <X className="mr-1 h-3.5 w-3.5" />
                                Skip
                              </Button>
                            </>
                          )}
                          {candidate.status === "skipped" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-zinc-400 hover:text-zinc-100"
                              onClick={() =>
                                updateCandidateStatus(candidate.id, "new")
                              }
                            >
                              Restore
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`replied-${candidate.id}`}
                            checked={candidate.status === "replied"}
                            onCheckedChange={(checked) =>
                              updateCandidateStatus(
                                candidate.id,
                                checked ? "replied" : "new"
                              )
                            }
                          />
                          <Label
                            htmlFor={`replied-${candidate.id}`}
                            className="text-xs text-zinc-400 cursor-pointer select-none"
                          >
                            Replied
                          </Label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* =============================================================== */}
        {/* RIGHT PANEL — Reply Targets */}
        {/* =============================================================== */}
        <div className="w-80 shrink-0 space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-200">
                  Reply Targets
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setAddDialogOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {loadingTargets ? (
                <p className="py-4 text-center text-xs text-zinc-500">
                  Loading...
                </p>
              ) : targets.length === 0 ? (
                <div className="flex flex-col items-center py-6">
                  <User className="mb-2 h-6 w-6 text-zinc-600" />
                  <p className="text-xs text-zinc-500">
                    No target accounts yet.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs"
                    onClick={() => setAddDialogOpen(true)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Account
                  </Button>
                </div>
              ) : (
                targets.map((target) => {
                  const keywords = parseJSON<string[]>(target.keywords, []);
                  return (
                    <div
                      key={target.id}
                      className={cn(
                        "group flex items-start gap-3 rounded-lg p-2.5 transition-colors",
                        target.isActive
                          ? "hover:bg-zinc-800/50"
                          : "opacity-50 hover:bg-zinc-800/30"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-zinc-200">
                            @{target.accountHandle}
                          </p>
                          {target.isActive ? (
                            <Eye className="h-3 w-3 text-green-500/60 shrink-0" />
                          ) : (
                            <EyeOff className="h-3 w-3 text-zinc-600 shrink-0" />
                          )}
                        </div>
                        {target.accountName && (
                          <p className="truncate text-xs text-zinc-500">
                            {target.accountName}
                          </p>
                        )}
                        {keywords.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {keywords.map((kw, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="border-zinc-700 text-zinc-500 text-[10px] px-1.5 py-0"
                              >
                                {kw}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleTarget(target)}
                          title={
                            target.isActive ? "Deactivate" : "Activate"
                          }
                        >
                          {target.isActive ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-zinc-400 hover:text-red-400"
                          onClick={() => deleteTarget(target.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Add Target Dialog */}
      {/* ================================================================= */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Reply Target</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="handle">Account Handle</Label>
              <Input
                id="handle"
                placeholder="elonmusk"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name (optional)</Label>
              <Input
                id="displayName"
                placeholder="Elon Musk"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keywords">
                Keywords{" "}
                <span className="text-zinc-500 font-normal">
                  (comma-separated)
                </span>
              </Label>
              <Input
                id="keywords"
                placeholder="AI, startups, design"
                value={newKeywords}
                onChange={(e) => setNewKeywords(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={addTarget} disabled={!newHandle.trim()}>
              <Plus className="mr-1 h-4 w-4" />
              Add Target
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
