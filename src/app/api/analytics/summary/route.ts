import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const analytics = await prisma.analytics.findMany({
      include: {
        scheduledPost: {
          include: { draft: true },
        },
      },
      orderBy: { fetchedAt: "desc" },
    });

    if (analytics.length === 0) {
      return NextResponse.json({
        totals: {
          impressions: 0,
          likes: 0,
          retweets: 0,
          bookmarks: 0,
          replies: 0,
          profileVisits: 0,
          posts: 0,
        },
        posts7d: 0,
        posts30d: 0,
        avgEngagementRate: 0,
        bestPerformer: null,
        bestDayOfWeek: null,
        bestHourOfDay: null,
        lanePerformance: {},
        topPerformers: [],
        dailyImpressions: [],
        recentPostEngagement: [],
        heatmap: [],
        platformSplit: [],
        raw: [],
      });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalImpressions = analytics.reduce((s, a) => s + a.impressions, 0);
    const totalLikes = analytics.reduce((s, a) => s + a.likes, 0);
    const totalRetweets = analytics.reduce((s, a) => s + a.retweets, 0);
    const totalBookmarks = analytics.reduce((s, a) => s + a.bookmarks, 0);
    const totalReplies = analytics.reduce((s, a) => s + a.replies, 0);
    const totalProfileVisits = analytics.reduce((s, a) => s + a.profileVisits, 0);
    const totalEngagements = totalLikes + totalRetweets + totalReplies;

    // Posts in time windows
    const posts7d = analytics.filter(
      (a) => a.scheduledPost.postedAt && new Date(a.scheduledPost.postedAt) >= sevenDaysAgo
    ).length;
    const posts30d = analytics.filter(
      (a) => a.scheduledPost.postedAt && new Date(a.scheduledPost.postedAt) >= thirtyDaysAgo
    ).length;

    // Avg engagement rate
    const avgEngagementRate =
      totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;

    // Best performing post
    const bestPerformer = [...analytics].sort((a, b) => b.impressions - a.impressions)[0];

    // Best day of week and hour of day
    const dayEngagement: Record<number, { total: number; count: number }> = {};
    const hourEngagement: Record<number, { total: number; count: number }> = {};

    for (const a of analytics) {
      const postedAt = a.scheduledPost.postedAt;
      if (!postedAt) continue;
      const date = new Date(postedAt);
      const day = date.getDay();
      const hour = date.getHours();
      const eng = a.likes + a.retweets + a.replies;

      if (!dayEngagement[day]) dayEngagement[day] = { total: 0, count: 0 };
      dayEngagement[day].total += eng;
      dayEngagement[day].count += 1;

      if (!hourEngagement[hour]) hourEngagement[hour] = { total: 0, count: 0 };
      hourEngagement[hour].total += eng;
      hourEngagement[hour].count += 1;
    }

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    let bestDayOfWeek: string | null = null;
    let bestDayAvg = 0;
    for (const [day, data] of Object.entries(dayEngagement)) {
      const avg = data.total / data.count;
      if (avg > bestDayAvg) {
        bestDayAvg = avg;
        bestDayOfWeek = dayNames[Number(day)];
      }
    }

    let bestHourOfDay: number | null = null;
    let bestHourAvg = 0;
    for (const [hour, data] of Object.entries(hourEngagement)) {
      const avg = data.total / data.count;
      if (avg > bestHourAvg) {
        bestHourAvg = avg;
        bestHourOfDay = Number(hour);
      }
    }

    // Daily impressions (last 30 days)
    const dailyMap: Record<string, number> = {};
    for (const a of analytics) {
      const postedAt = a.scheduledPost.postedAt;
      if (!postedAt) continue;
      const date = new Date(postedAt);
      if (date < thirtyDaysAgo) continue;
      const key = date.toISOString().split("T")[0];
      dailyMap[key] = (dailyMap[key] || 0) + a.impressions;
    }
    const dailyImpressions = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, impressions]) => ({ date, impressions }));

    // Recent post engagement (last 10)
    const recentPostEngagement = [...analytics]
      .sort((a, b) => {
        const aDate = a.scheduledPost.postedAt ? new Date(a.scheduledPost.postedAt).getTime() : 0;
        const bDate = b.scheduledPost.postedAt ? new Date(b.scheduledPost.postedAt).getTime() : 0;
        return bDate - aDate;
      })
      .slice(0, 10)
      .map((a) => ({
        content: a.scheduledPost.draft.content.slice(0, 40),
        likes: a.likes,
        retweets: a.retweets,
        replies: a.replies,
      }));

    // Heatmap: day × hour → avg engagement
    const heatmap: Array<{ day: number; dayName: string; hour: number; avgEngagement: number }> = [];
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const key = `${d}-${h}`;
        let total = 0;
        let count = 0;
        for (const a of analytics) {
          const postedAt = a.scheduledPost.postedAt;
          if (!postedAt) continue;
          const date = new Date(postedAt);
          if (date.getDay() === d && date.getHours() === h) {
            total += a.likes + a.retweets + a.replies;
            count += 1;
          }
        }
        if (count > 0) {
          heatmap.push({
            day: d,
            dayName: dayNames[d],
            hour: h,
            avgEngagement: Math.round(total / count),
          });
        }
      }
    }

    // Platform split
    const platformMap: Record<string, number> = {};
    for (const a of analytics) {
      platformMap[a.platform] = (platformMap[a.platform] || 0) + 1;
    }
    const platformSplit = Object.entries(platformMap).map(([platform, count]) => ({
      platform,
      count,
    }));

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

    // Top performers (20 posts)
    const topPerformers = [...analytics]
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 20)
      .map((a) => ({
        id: a.id,
        content: a.scheduledPost.draft.content,
        platform: a.platform,
        postedAt: a.scheduledPost.postedAt,
        impressions: a.impressions,
        likes: a.likes,
        retweets: a.retweets,
        replies: a.replies,
        engagementRate:
          a.impressions > 0
            ? Number((((a.likes + a.retweets + a.replies) / a.impressions) * 100).toFixed(2))
            : 0,
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
      posts7d,
      posts30d,
      avgEngagementRate: Number(avgEngagementRate.toFixed(2)),
      bestPerformer: bestPerformer
        ? {
            content: bestPerformer.scheduledPost.draft.content.slice(0, 100),
            impressions: bestPerformer.impressions,
          }
        : null,
      bestDayOfWeek,
      bestHourOfDay,
      lanePerformance,
      topPerformers,
      dailyImpressions,
      recentPostEngagement,
      heatmap,
      platformSplit,
      raw: analytics,
    });
  } catch (error) {
    console.error("Analytics summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics summary" },
      { status: 500 }
    );
  }
}
