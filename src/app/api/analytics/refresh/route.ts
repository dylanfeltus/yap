import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchTweetMetrics } from "@/lib/x-api";

export async function POST() {
  try {
    // Find all posted tweets that have an externalId (X tweet ID)
    const postedTweets = await prisma.scheduledPost.findMany({
      where: {
        status: "posted",
        platform: "X",
        externalId: { not: null },
      },
      include: {
        draft: true,
      },
    });

    if (postedTweets.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No posted tweets to refresh",
        updated: 0,
      });
    }

    let updated = 0;
    const errors: string[] = [];

    for (const post of postedTweets) {
      if (!post.externalId) continue;

      try {
        const metrics = await fetchTweetMetrics(post.externalId);

        if (!metrics) {
          errors.push(`Failed to fetch metrics for tweet ${post.externalId}`);
          continue;
        }

        // Check if analytics already exists for this post
        const existing = await prisma.analytics.findFirst({
          where: { scheduledPostId: post.id },
        });

        if (existing) {
          // Update existing analytics
          await prisma.analytics.update({
            where: { id: existing.id },
            data: {
              impressions: metrics.impression_count,
              likes: metrics.like_count,
              retweets: metrics.retweet_count,
              bookmarks: metrics.bookmark_count,
              replies: metrics.reply_count,
              fetchedAt: new Date(),
            },
          });
        } else {
          // Create new analytics record
          await prisma.analytics.create({
            data: {
              scheduledPostId: post.id,
              platform: "X",
              externalId: post.externalId,
              impressions: metrics.impression_count,
              likes: metrics.like_count,
              retweets: metrics.retweet_count,
              bookmarks: metrics.bookmark_count,
              replies: metrics.reply_count,
            },
          });
        }

        updated++;
      } catch (error) {
        console.error(`Error fetching metrics for ${post.externalId}:`, error);
        errors.push(
          `${post.externalId}: ${error instanceof Error ? error.message : "unknown error"}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Refreshed ${updated} of ${postedTweets.length} tweets`,
      updated,
      total: postedTweets.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Analytics refresh error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
