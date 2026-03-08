"use client";

import { useState } from "react";
import { cn, STATUS_COLORS, parseJSON } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Copy,
  ExternalLink,
  Check,
  X,
  User,
  Sparkles,
  TrendingUp,
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

export interface ReplyCandidate {
  id: string;
  externalPostId: string;
  authorHandle: string;
  authorName: string;
  content: string;
  engagement: string;
  platform: string;
  replySuggestions: string;
  status: string;
  repliedAt: string | null;
  tweetedAt: string | null;
  createdAt: string;
}

interface CandidateCardProps {
  candidate: ReplyCandidate;
  onUpdateStatus: (id: string, status: string) => void;
  onGenerateMore?: (id: string) => void;
  generatingMore?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFreshnessBadge(createdAt: string): { label: string; color: string; emoji: string } {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const hoursAgo = (now - created) / (1000 * 60 * 60);

  if (hoursAgo < 2) return { label: "HOT", color: "bg-red-500/20 text-red-400", emoji: "🔥" };
  if (hoursAgo < 6) return { label: "WARM", color: "bg-orange-500/20 text-orange-400", emoji: "🟠" };
  if (hoursAgo < 24) return { label: "COOL", color: "bg-blue-500/20 text-blue-400", emoji: "🔵" };
  return { label: "COLD", color: "bg-zinc-700/40 text-zinc-500", emoji: "🥶" };
}

function timeAgo(createdAt: string): string {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const mins = Math.floor((now - created) / (1000 * 60));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function copyToClipboard(text: string): boolean {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text);
    return true;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  return true;
}

export function computeOpportunityScore(engagement: Engagement): number {
  const views = engagement.views || 0;
  return views / 1000; // simplified — follower count not available in candidate data
}

export function computeVelocity(engagement: Engagement, tweetedAt: string | null): number {
  if (!tweetedAt) return 0;
  const ageHours = Math.max(1, (Date.now() - new Date(tweetedAt).getTime()) / (1000 * 60 * 60));
  return ((engagement.likes || 0) + (engagement.retweets || 0)) / ageHours;
}

function formatScore(score: number): string {
  if (score >= 100) return `${Math.round(score)}`;
  if (score >= 10) return score.toFixed(1);
  return score.toFixed(2);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CandidateCard({ candidate, onUpdateStatus, onGenerateMore, generatingMore }: CandidateCardProps) {
  const [copiedKeys, setCopiedKeys] = useState<Record<string, boolean>>({});

  const engagement = parseJSON<Engagement>(candidate.engagement, { likes: 0, retweets: 0, replies: 0, views: 0 });
  const suggestions = parseJSON<string[]>(candidate.replySuggestions, []);
  const freshness = getFreshnessBadge(candidate.tweetedAt || candidate.createdAt);
  const opportunityScore = computeOpportunityScore(engagement);
  const tweetUrl = `https://x.com/${candidate.authorHandle}/status/${candidate.externalPostId}`;

  function handleCopy(text: string, key: string) {
    copyToClipboard(text);
    setCopiedKeys((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedKeys((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  }

  function handleCopyAndOpen(text: string, key: string) {
    handleCopy(text, key);
    window.open(tweetUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
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

          <div className="flex items-center gap-2 shrink-0">
            {opportunityScore > 0 && (
              <Badge
                variant="outline"
                className="border-0 bg-indigo-500/15 text-indigo-400 text-[10px] gap-1"
              >
                <TrendingUp className="h-3 w-3" />
                {formatScore(opportunityScore)}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn("text-[10px] uppercase tracking-wider border-0", freshness.color)}
            >
              {freshness.emoji} {freshness.label} · {timeAgo(candidate.tweetedAt || candidate.createdAt)}
            </Badge>
            <Badge
              variant="outline"
              className={cn("text-[10px] uppercase tracking-wider border-0", STATUS_COLORS[candidate.status] || STATUS_COLORS.new)}
            >
              {candidate.status}
            </Badge>
            <a href={tweetUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
          {candidate.content}
        </p>

        {/* Engagement stats */}
        <div className="flex flex-wrap gap-2">
          {(engagement.views ?? 0) > 0 && (
            <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[11px]">
              {engagement.views.toLocaleString()} views
            </Badge>
          )}
          <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[11px]">
            {(engagement.likes ?? 0).toLocaleString()} likes
          </Badge>
          {engagement.retweets != null && (
            <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[11px]">
              {engagement.retweets.toLocaleString()} retweets
            </Badge>
          )}
          {engagement.replies != null && (
            <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[11px]">
              {engagement.replies.toLocaleString()} replies
            </Badge>
          )}
        </div>

        {/* Reply suggestions as individual cards */}
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
                      className="group rounded-lg border border-zinc-800 bg-zinc-950 p-3 transition-colors hover:border-zinc-700"
                    >
                      <p className="text-sm text-zinc-300 leading-relaxed mb-2">
                        {suggestion}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-7 text-xs transition-colors",
                            copiedKeys[copyKey]
                              ? "border-green-600 text-green-400 bg-green-500/10"
                              : "border-zinc-700 text-zinc-400"
                          )}
                          onClick={() => handleCopy(suggestion, copyKey)}
                        >
                          {copiedKeys[copyKey] ? (
                            <>
                              <Check className="mr-1 h-3 w-3" />
                              Copied ✓
                            </>
                          ) : (
                            <>
                              <Copy className="mr-1 h-3 w-3" />
                              Copy
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-zinc-700 text-zinc-400"
                          onClick={() => handleCopyAndOpen(suggestion, `${copyKey}-open`)}
                        >
                          {copiedKeys[`${copyKey}-open`] ? (
                            <>
                              <Check className="mr-1 h-3 w-3 text-green-400" />
                              Copied & Opened
                            </>
                          ) : (
                            <>
                              <ExternalLink className="mr-1 h-3 w-3" />
                              Copy & Open
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {onGenerateMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                  onClick={() => onGenerateMore(candidate.id)}
                  disabled={generatingMore}
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  {generatingMore ? "Generating..." : "Generate more"}
                </Button>
              )}
            </div>
          </>
        )}

        {/* Action bar */}
        <Separator className="bg-zinc-800" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {candidate.status === "new" && (
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-zinc-100"
                onClick={() => onUpdateStatus(candidate.id, "skipped")}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Skip
              </Button>
            )}
            {candidate.status === "skipped" && (
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-zinc-100"
                onClick={() => onUpdateStatus(candidate.id, "new")}
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
                onUpdateStatus(candidate.id, checked ? "replied" : "new")
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
}
