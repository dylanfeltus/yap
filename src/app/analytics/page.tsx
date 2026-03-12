"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Eye,
  TrendingUp,
  Clock,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveUpdates } from "@/lib/use-live-updates";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/analytics/stat-card";
import { ImpressionsChart } from "@/components/analytics/impressions-chart";
import { EngagementChart } from "@/components/analytics/engagement-chart";
import { TimeHeatmap } from "@/components/analytics/time-heatmap";
import { TopPosts } from "@/components/analytics/top-posts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalyticsSummary {
  totals: {
    impressions: number;
    likes: number;
    retweets: number;
    bookmarks: number;
    replies: number;
    profileVisits: number;
    posts: number;
  };
  posts7d: number;
  posts30d: number;
  avgEngagementRate: number;
  bestPerformer: { content: string; impressions: number } | null;
  bestDayOfWeek: string | null;
  bestHourOfDay: number | null;
  dailyImpressions: Array<{ date: string; impressions: number }>;
  recentPostEngagement: Array<{
    content: string;
    likes: number;
    retweets: number;
    replies: number;
  }>;
  heatmap: Array<{
    day: number;
    dayName: string;
    hour: number;
    avgEngagement: number;
  }>;
  platformSplit: Array<{ platform: string; count: number }>;
  topPerformers: Array<{
    id: string;
    content: string;
    platform: string;
    postedAt: string | null;
    impressions: number;
    likes: number;
    retweets: number;
    replies: number;
    engagementRate: number;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

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

  useLiveUpdates("analytics", fetchData);

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
      await fetchData();
    } catch (err) {
      console.error("Failed to refresh analytics:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRefreshing(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-zinc-500">Content performance dashboard</p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse border border-zinc-800 bg-zinc-900">
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

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-zinc-500">Content performance dashboard</p>
        </div>
        <Card className="border border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-center gap-3 p-6">
            <BarChart3 className="h-5 w-5 text-red-400" />
            <p className="text-sm text-red-400">Failed to load analytics: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state
  const isEmpty = !data || data.totals.posts === 0;

  if (isEmpty) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-zinc-500">Content performance dashboard</p>
        </div>
        <Card className="border border-zinc-800 bg-zinc-900">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800">
              <BarChart3 className="h-7 w-7 text-zinc-500" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-zinc-300">
                No analytics data yet
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Posts will appear here after publishing.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { totals } = data;
  const bestTime =
    data.bestDayOfWeek && data.bestHourOfDay !== null
      ? `${data.bestDayOfWeek} ${formatHour(data.bestHourOfDay)}`
      : "—";

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
          className="flex items-center gap-2 rounded-md bg-green-500/10 px-4 py-2 text-sm font-medium text-green-400 transition-colors hover:bg-green-500/20 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          {refreshing ? "Refreshing..." : "Refresh from X"}
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Posts"
          value={formatNumber(totals.posts)}
          trend={`${data.posts7d} in last 7d`}
          icon={BarChart3}
        />
        <StatCard
          label="Total Impressions"
          value={formatNumber(totals.impressions)}
          icon={Eye}
        />
        <StatCard
          label="Avg Engagement Rate"
          value={`${data.avgEngagementRate}%`}
          trend={`${formatNumber(totals.likes + totals.retweets + totals.replies)} engagements`}
          icon={TrendingUp}
        />
        <StatCard
          label="Best Posting Time"
          value={bestTime}
          icon={Clock}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ImpressionsChart data={data.dailyImpressions} />
        <EngagementChart data={data.recentPostEngagement} />
      </div>

      {/* Charts Row 2 */}
      <TimeHeatmap data={data.heatmap} />

      {/* Top Posts Table */}
      <TopPosts data={data.topPerformers} />
    </div>
  );
}
