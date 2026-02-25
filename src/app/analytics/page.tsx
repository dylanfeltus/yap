"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Eye,
  Heart,
  Repeat2,
  Bookmark,
  MessageSquare,
  Users,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { cn, LANE_COLORS } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Totals {
  impressions: number;
  likes: number;
  retweets: number;
  bookmarks: number;
  replies: number;
  profileVisits: number;
  posts: number;
}

interface LaneStats {
  impressions: number;
  likes: number;
  posts: number;
}

interface TopPerformer {
  id: string;
  content: string;
  platform: string;
  impressions: number;
  likes: number;
  retweets: number;
}

interface AnalyticsSummary {
  totals: Totals;
  lanePerformance: Record<string, LaneStats>;
  topPerformers: TopPerformer[];
  raw: unknown[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// Lane accent color mapping for card left-border & icon tinting
const LANE_ACCENT: Record<string, string> = {
  "AI/Builder": "border-l-violet-500",
  Design: "border-l-pink-500",
  "Creator Economy": "border-l-amber-500",
  "Behind the Scenes": "border-l-emerald-500",
};

// ---------------------------------------------------------------------------
// Stat card config
// ---------------------------------------------------------------------------

const STAT_CARDS: {
  key: keyof Totals;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "impressions", label: "Total Impressions", icon: Eye },
  { key: "likes", label: "Total Likes", icon: Heart },
  { key: "retweets", label: "Total Retweets", icon: Repeat2 },
  { key: "bookmarks", label: "Total Bookmarks", icon: Bookmark },
  { key: "replies", label: "Total Replies", icon: MessageSquare },
  { key: "profileVisits", label: "Profile Visits", icon: Users },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch("/api/analytics/summary");
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const json: AnalyticsSummary = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/analytics/refresh", { method: "POST" });
      const result = await res.json();
      
      if (!result.success) {
        throw new Error(result.error || "Failed to refresh analytics");
      }

      // Refetch the data after refresh
      await fetchData();
      
      // Show success message (you could add a toast here)
      console.log("Analytics refreshed:", result);
    } catch (err) {
      console.error("Failed to refresh analytics:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRefreshing(false);
    }
  }

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Content performance dashboard
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card
              key={i}
              className="animate-pulse border-zinc-800 bg-zinc-900"
            >
              <CardContent className="p-5">
                <div className="h-4 w-20 rounded bg-zinc-800" />
                <div className="mt-3 h-8 w-16 rounded bg-zinc-800" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Content performance dashboard
          </p>
        </div>
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-center gap-3 p-6">
            <BarChart3 className="h-5 w-5 text-red-400" />
            <p className="text-sm text-red-400">
              Failed to load analytics: {error}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Empty state ----
  const isEmpty =
    !data || (data.totals.posts === 0 && data.topPerformers.length === 0);

  if (isEmpty) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Content performance dashboard
          </p>
        </div>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800">
              <BarChart3 className="h-7 w-7 text-zinc-500" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-zinc-300">
                No analytics data yet
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Post some content and check back!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Data available ----
  const { totals, lanePerformance, topPerformers } = data!;

  // Platform breakdown from raw data
  const platformStats: Record<
    string,
    { impressions: number; likes: number; retweets: number; posts: number }
  > = {};
  if (data?.raw && Array.isArray(data.raw)) {
    for (const entry of data.raw as Array<{
      platform: string;
      impressions: number;
      likes: number;
      retweets: number;
    }>) {
      const p = entry.platform;
      if (!platformStats[p]) {
        platformStats[p] = { impressions: 0, likes: 0, retweets: 0, posts: 0 };
      }
      platformStats[p].impressions += entry.impressions;
      platformStats[p].likes += entry.likes;
      platformStats[p].retweets += entry.retweets;
      platformStats[p].posts += 1;
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Content performance dashboard &middot;{" "}
            {totals.posts} post{totals.posts !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-md bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-400 transition-colors hover:bg-indigo-500/20 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          {refreshing ? "Refreshing..." : "Refresh from X"}
        </button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Top Metrics Row                                                    */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {STAT_CARDS.map(({ key, label, icon: Icon }) => (
          <Card
            key={key}
            className="border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700"
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  {label}
                </span>
                <Icon className="h-4 w-4 text-zinc-600" />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-100">
                {formatNumber(totals[key])}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Performance by Lane                                                */}
      {/* ----------------------------------------------------------------- */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-zinc-500" />
          <h2 className="text-lg font-semibold">Performance by Lane</h2>
        </div>

        {Object.keys(lanePerformance).length === 0 ? (
          <p className="text-sm text-zinc-500">
            No lane data available yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(lanePerformance).map(([lane, stats]) => (
              <Card
                key={lane}
                className={cn(
                  "border-l-4 border-zinc-800 bg-zinc-900",
                  LANE_ACCENT[lane] ?? "border-l-zinc-600"
                )}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    <Badge
                      className={cn(
                        "text-xs",
                        LANE_COLORS[lane] ?? "bg-zinc-700 text-zinc-300"
                      )}
                    >
                      {lane}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-zinc-500">Impressions</span>
                    <span className="text-sm font-semibold tabular-nums text-zinc-200">
                      {formatNumber(stats.impressions)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-zinc-500">Likes</span>
                    <span className="text-sm font-semibold tabular-nums text-zinc-200">
                      {formatNumber(stats.likes)}
                    </span>
                  </div>
                  <Separator className="bg-zinc-800" />
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-zinc-500">Posts</span>
                    <span className="text-sm font-semibold tabular-nums text-zinc-200">
                      {stats.posts}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Performance by Platform                                            */}
      {/* ----------------------------------------------------------------- */}
      {Object.keys(platformStats).length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-zinc-500" />
            <h2 className="text-lg font-semibold">Performance by Platform</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(platformStats).map(([platform, stats]) => (
              <Card
                key={platform}
                className="border-zinc-800 bg-zinc-900"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-300">
                    {platform}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-zinc-500">Impressions</span>
                    <span className="text-sm font-semibold tabular-nums text-zinc-200">
                      {formatNumber(stats.impressions)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-zinc-500">Likes</span>
                    <span className="text-sm font-semibold tabular-nums text-zinc-200">
                      {formatNumber(stats.likes)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-zinc-500">Retweets</span>
                    <span className="text-sm font-semibold tabular-nums text-zinc-200">
                      {formatNumber(stats.retweets)}
                    </span>
                  </div>
                  <Separator className="bg-zinc-800" />
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-zinc-500">Posts</span>
                    <span className="text-sm font-semibold tabular-nums text-zinc-200">
                      {stats.posts}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Top Performers                                                     */}
      {/* ----------------------------------------------------------------- */}
      {topPerformers.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-zinc-500" />
            <h2 className="text-lg font-semibold">Top Performers</h2>
          </div>
          <Card className="overflow-hidden border-zinc-800 bg-zinc-900">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left">
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      #
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Content
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Platform
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Impressions
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Likes
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Retweets
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topPerformers.map((post, idx) => (
                    <tr
                      key={post.id}
                      className={cn(
                        "border-b border-zinc-800/60 transition-colors hover:bg-zinc-800/40",
                        idx % 2 === 0 ? "bg-zinc-900" : "bg-zinc-900/60"
                      )}
                    >
                      <td className="whitespace-nowrap px-5 py-3 tabular-nums text-zinc-500">
                        {idx + 1}
                      </td>
                      <td className="max-w-xs truncate px-5 py-3 text-zinc-300">
                        {post.content}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <Badge
                          variant="outline"
                          className="border-zinc-700 text-xs text-zinc-400"
                        >
                          {post.platform}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-zinc-200">
                        {formatNumber(post.impressions)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-zinc-200">
                        {formatNumber(post.likes)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-zinc-200">
                        {formatNumber(post.retweets)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
