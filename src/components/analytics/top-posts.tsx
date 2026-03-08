"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TopPost {
  id: string;
  content: string;
  platform: string;
  postedAt: string | null;
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
  engagementRate: number;
}

interface TopPostsProps {
  data: TopPost[];
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function TopPosts({ data }: TopPostsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <Card className="border border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-300">
            Top Posts
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-32 items-center justify-center">
          <p className="text-sm text-zinc-500">No posts to display yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border border-zinc-800 bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-zinc-300">
          Top Posts by Impressions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Content
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Platform
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Posted
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Impressions
                </th>
                <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 md:table-cell">
                  Likes
                </th>
                <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 md:table-cell">
                  Retweets
                </th>
                <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 md:table-cell">
                  Replies
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Eng. Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((post) => {
                const isExpanded = expandedId === post.id;
                return (
                  <tr
                    key={post.id}
                    className="cursor-pointer border-b border-zinc-800/60 transition-colors hover:bg-zinc-800/40"
                    onClick={() => setExpandedId(isExpanded ? null : post.id)}
                  >
                    <td className="px-4 py-3 text-zinc-300">
                      <div className="flex items-start gap-2">
                        {isExpanded ? (
                          <ChevronUp className="mt-0.5 h-3 w-3 shrink-0 text-zinc-500" />
                        ) : (
                          <ChevronDown className="mt-0.5 h-3 w-3 shrink-0 text-zinc-500" />
                        )}
                        <span className={isExpanded ? "" : "line-clamp-1 max-w-xs"}>
                          {post.content}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge
                        variant="outline"
                        className="border-zinc-700 text-xs text-zinc-400"
                      >
                        {post.platform}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                      {formatDate(post.postedAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-200">
                      {formatNumber(post.impressions)}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-200 md:table-cell">
                      {formatNumber(post.likes)}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-200 md:table-cell">
                      {formatNumber(post.retweets)}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-200 md:table-cell">
                      {formatNumber(post.replies)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-200">
                      {post.engagementRate}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
