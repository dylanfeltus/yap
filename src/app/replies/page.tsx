"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { MessageSquare, Plus, User, Users, X, Copy, Check } from "lucide-react";
import { CandidateCard, computeOpportunityScore, computeVelocity } from "@/components/replies/candidate-card";
import type { ReplyCandidate } from "@/components/replies/candidate-card";
import { TargetCard } from "@/components/replies/target-card";
import type { ReplyTarget } from "@/components/replies/target-card";
import { SortControls } from "@/components/replies/sort-controls";
import type { SortMode } from "@/components/replies/sort-controls";

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
  const [mobileTargetsOpen, setMobileTargetsOpen] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const isFirstTime = !loadingTargets && !loadingCandidates && targets.length === 0 && candidates.length === 0;

  const setupPrompt = `Set up Reply Guy for me. Here's what I need:

1. Add reply targets — these are X/Twitter accounts I want to monitor for reply opportunities. Add accounts that are in my niche, post frequently, and get good engagement. Use POST /replies/targets with { accountHandle: "handle" }.

2. Find recent tweets from those targets that are worth replying to. Look for tweets with good engagement and relevant topics.

3. For each good tweet, create a reply candidate with suggested replies in my voice. Use POST /replies/candidates with the tweet content, engagement stats, and 2-3 reply suggestions.

4. Read my voice profile first (GET /voice) so the reply suggestions match my tone.

Focus on tweets from the last 24 hours. Prioritize tweets with high engagement but few replies (best opportunity window).`;

  const copySetupPrompt = async () => {
    await navigator.clipboard.writeText(setupPrompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  // Close mobile panel on outside click
  useEffect(() => {
    if (!mobileTargetsOpen) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setMobileTargetsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mobileTargetsOpen]);

  const targetsPanel = (
    <>
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
    </>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Reply Guy</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Curate and copy reply suggestions for high-engagement posts. Copy/paste only — no automated posting.
        </p>
      </div>

      {/* First-time onboarding */}
      {isFirstTime && (
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <span className="text-xs font-medium text-zinc-500">
                Give this to your AI agent to get started
              </span>
              <button
                onClick={copySetupPrompt}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  promptCopied
                    ? "bg-green-500/20 text-green-400"
                    : "bg-green-500 text-black hover:bg-green-400"
                }`}
              >
                {promptCopied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {promptCopied ? "Copied!" : "Copy prompt"}
              </button>
            </div>
            <pre className="whitespace-pre-wrap p-5 text-[13px] leading-relaxed text-zinc-300 font-mono">
              {setupPrompt}
            </pre>
          </div>
          <p className="text-center text-xs text-zinc-600">
            Or add targets manually using the + button below
          </p>
        </div>
      )}

      <div className={`flex gap-6 ${isFirstTime ? "mt-6" : ""}`}>
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
              {/* Mobile: targets toggle button */}
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden"
                onClick={() => setMobileTargetsOpen(!mobileTargetsOpen)}
              >
                <Users className="mr-1.5 h-3.5 w-3.5" />
                Targets
                {targets.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300">
                    {targets.filter((t) => t.isActive).length}
                  </span>
                )}
              </Button>
              <SortControls value={sortMode} onChange={setSortMode} />
            </div>
          </div>

          {/* Mobile: slide-down targets panel */}
          {mobileTargetsOpen && (
            <div ref={panelRef} className="lg:hidden rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-zinc-200">Reply Targets</h3>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAddDialogOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMobileTargetsOpen(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {targetsPanel}
            </div>
          )}

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

        {/* Right panel — Targets (desktop only) */}
        <div className="hidden lg:block w-80 shrink-0 space-y-4">
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
              {targetsPanel}
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
