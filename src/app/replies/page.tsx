"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { parseJSON } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Plus, User } from "lucide-react";
import { CandidateCard, computeOpportunityScore, computeVelocity } from "@/components/replies/candidate-card";
import type { ReplyCandidate } from "@/components/replies/candidate-card";
import { TargetCard } from "@/components/replies/target-card";
import type { ReplyTarget } from "@/components/replies/target-card";
import { SortControls } from "@/components/replies/sort-controls";
import type { SortMode } from "@/components/replies/sort-controls";
import { RefreshButton } from "@/components/replies/refresh-button";
import { useLiveUpdates } from "@/lib/use-live-updates";

type StatusFilter = "new" | "replied" | "skipped";

export default function RepliesPage() {
  const [candidates, setCandidates] = useState<ReplyCandidate[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("new");
  const [sortMode, setSortMode] = useState<SortMode>("opportunity");
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [targets, setTargets] = useState<ReplyTarget[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [newName, setNewName] = useState("");
  const [newKeywords, setNewKeywords] = useState("");

  const fetchCandidates = useCallback(async () => {
    setLoadingCandidates(true);
    try {
      const res = await fetch(`/api/replies/candidates?status=${statusFilter}`);
      if (res.ok) setCandidates(await res.json());
    } finally {
      setLoadingCandidates(false);
    }
  }, [statusFilter]);

  const fetchTargets = useCallback(async () => {
    setLoadingTargets(true);
    try {
      const res = await fetch("/api/replies/targets");
      if (res.ok) setTargets(await res.json());
    } finally {
      setLoadingTargets(false);
    }
  }, []);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);
  useEffect(() => { fetchTargets(); }, [fetchTargets]);

  const fetchAll = useCallback(() => { fetchCandidates(); fetchTargets(); }, [fetchCandidates, fetchTargets]);
  useLiveUpdates("replies", fetchAll);

  const sortedCandidates = useMemo(() => {
    const sorted = [...candidates];
    if (sortMode === "newest") {
      sorted.sort((a, b) => new Date(b.tweetedAt || b.createdAt).getTime() - new Date(a.tweetedAt || a.createdAt).getTime());
    } else if (sortMode === "opportunity") {
      sorted.sort((a, b) => {
        const eA = parseJSON<{ likes: number; retweets: number; replies: number; views: number }>(a.engagement, { likes: 0, retweets: 0, replies: 0, views: 0 });
        const eB = parseJSON<{ likes: number; retweets: number; replies: number; views: number }>(b.engagement, { likes: 0, retweets: 0, replies: 0, views: 0 });
        return computeOpportunityScore(eB) - computeOpportunityScore(eA);
      });
    } else {
      sorted.sort((a, b) => {
        const eA = parseJSON<{ likes: number; retweets: number; replies: number; views: number }>(a.engagement, { likes: 0, retweets: 0, replies: 0, views: 0 });
        const eB = parseJSON<{ likes: number; retweets: number; replies: number; views: number }>(b.engagement, { likes: 0, retweets: 0, replies: 0, views: 0 });
        return computeVelocity(eB, b.tweetedAt) - computeVelocity(eA, a.tweetedAt);
      });
    }
    return sorted;
  }, [candidates, sortMode]);

  async function updateCandidateStatus(id: string, status: string) {
    const res = await fetch(`/api/replies/candidates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setCandidates((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleGenerateMore(candidateId: string) {
    await fetch("/api/replies/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId }),
    });
  }

  async function addTarget() {
    if (!newHandle.trim()) return;
    const res = await fetch("/api/replies/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountHandle: newHandle.trim().replace(/^@/, ""),
        accountName: newName.trim(),
        keywords: newKeywords.split(",").map((k) => k.trim()).filter(Boolean),
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
    if (res.ok) setTargets((prev) => prev.map((t) => t.id === target.id ? { ...t, isActive: !t.isActive } : t));
  }

  async function deleteTarget(id: string) {
    const res = await fetch(`/api/replies/targets/${id}`, { method: "DELETE" });
    if (res.ok) setTargets((prev) => prev.filter((t) => t.id !== id));
  }

  const statusFilters: StatusFilter[] = ["new", "replied", "skipped"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Reply Guy</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Curate and copy reply suggestions for high-engagement posts. Copy/paste only — no automated posting.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Left panel — Candidates */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {statusFilters.map((s) => (
                <Button key={s} variant={statusFilter === s ? "secondary" : "ghost"} size="sm" onClick={() => setStatusFilter(s)} className="capitalize">
                  {s}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <RefreshButton onRefreshComplete={fetchCandidates} />
              <SortControls value={sortMode} onChange={setSortMode} />
            </div>
          </div>

          {loadingCandidates ? (
            <p className="py-12 text-center text-sm text-zinc-500">Loading candidates...</p>
          ) : sortedCandidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 py-16">
              <MessageSquare className="mb-3 h-8 w-8 text-zinc-600" />
              <p className="text-sm text-zinc-500">No {statusFilter} candidates found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedCandidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  onUpdateStatus={updateCandidateStatus}
                  onGenerateMore={handleGenerateMore}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right panel — Targets */}
        <div className="w-80 shrink-0 space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-200">Reply Targets</CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {loadingTargets ? (
                <p className="py-4 text-center text-xs text-zinc-500">Loading...</p>
              ) : targets.length === 0 ? (
                <div className="flex flex-col items-center py-6">
                  <User className="mb-2 h-6 w-6 text-zinc-600" />
                  <p className="text-xs text-zinc-500">No target accounts yet.</p>
                  <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setAddDialogOpen(true)}>
                    <Plus className="mr-1 h-3 w-3" /> Add Account
                  </Button>
                </div>
              ) : (
                targets.map((target) => (
                  <TargetCard key={target.id} target={target} onToggle={toggleTarget} onDelete={deleteTarget} />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Target Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Reply Target</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="handle">Account Handle</Label>
              <Input id="handle" placeholder="elonmusk" value={newHandle} onChange={(e) => setNewHandle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name (optional)</Label>
              <Input id="displayName" placeholder="Elon Musk" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords <span className="text-zinc-500 font-normal">(comma-separated)</span></Label>
              <Input id="keywords" placeholder="AI, startups, design" value={newKeywords} onChange={(e) => setNewKeywords(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={addTarget} disabled={!newHandle.trim()}>
              <Plus className="mr-1 h-4 w-4" /> Add Target
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
