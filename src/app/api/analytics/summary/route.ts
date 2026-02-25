import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const analytics = await prisma.analytics.findMany({
    include: {
      scheduledPost: {
        include: { draft: true },
      },
    },
    orderBy: { fetchedAt: "desc" },
  });

  const totalImpressions = analytics.reduce((s, a) => s + a.impressions, 0);
  const totalLikes = analytics.reduce((s, a) => s + a.likes, 0);
  const totalRetweets = analytics.reduce((s, a) => s + a.retweets, 0);
  const totalBookmarks = analytics.reduce((s, a) => s + a.bookmarks, 0);
  const totalReplies = analytics.reduce((s, a) => s + a.replies, 0);
  const totalProfileVisits = analytics.reduce((s, a) => s + a.profileVisits, 0);

  // Performance by lane
  const lanePerformance: Record<string, { impressions: number; likes: number; posts: number }> = {};
  for (const a of analytics) {
    const lanes = JSON.parse(a.scheduledPost.draft.lanes) as string[];
    for (const lane of lanes) {
      if (!lanePerformance[lane]) {
        lanePerformance[lane] = { impressions: 0, likes: 0, posts: 0 };
      }
      lanePerformance[lane].impressions += a.impressions;
      lanePerformance[lane].likes += a.likes;
      lanePerformance[lane].posts += 1;
    }
  }

  // Top performers
  const topPerformers = [...analytics]
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map((a) => ({
      id: a.id,
      content: a.scheduledPost.draft.content.slice(0, 100),
      platform: a.platform,
      impressions: a.impressions,
      likes: a.likes,
      retweets: a.retweets,
    }));

  return NextResponse.json({
    totals: {
      impressions: totalImpressions,
      likes: totalLikes,
      retweets: totalRetweets,
      bookmarks: totalBookmarks,
      replies: totalReplies,
      profileVisits: totalProfileVisits,
      posts: analytics.length,
    },
    lanePerformance,
    topPerformers,
    raw: analytics,
  });
}
