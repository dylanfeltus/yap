import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchUserTimeline } from "@/lib/x-api";
import { emit } from "@/lib/events";

export async function POST() {
  try {
    // Get the connected X account
    const xAccount = await prisma.xAccount.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!xAccount) {
      return NextResponse.json(
        { success: false, error: "No X account connected" },
        { status: 400 }
      );
    }

    // Fetch recent tweets directly from user's timeline
    const tweets = await fetchUserTimeline(xAccount.userId, 50);

    if (tweets.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No tweets found",
        updated: 0,
      });
    }

    let created = 0;
    let updated = 0;

    for (const tweet of tweets) {
      const m = tweet.public_metrics;

      // Check if we already track this tweet
      const existing = await prisma.analytics.findFirst({
        where: { externalId: tweet.id },
      });

      if (existing) {
        await prisma.analytics.update({
          where: { id: existing.id },
          data: {
            impressions: m.impression_count,
            likes: m.like_count,
            retweets: m.retweet_count,
            bookmarks: m.bookmark_count,
            replies: m.reply_count,
            fetchedAt: new Date(),
          },
        });
        updated++;
      } else {
        // Check if a scheduled post already exists for this tweet (posted via our pipeline)
        // Thread posts store IDs as comma-separated, so check both exact and contains match
        const existingPost = await prisma.scheduledPost.findFirst({
          where: {
            OR: [
              { externalId: tweet.id },
              { externalId: { contains: tweet.id } },
            ],
          },
        });

        let scheduledPostId: string;

        if (existingPost) {
          // Link analytics to the existing scheduled post — no duplicate
          scheduledPostId = existingPost.id;
        } else {
          // External tweet not posted via our pipeline — create placeholder
          const draft = await prisma.draft.create({
            data: {
              content: tweet.text,
              platform: "X",
              lanes: "[]",
              status: "posted",
            },
          });

          const scheduledPost = await prisma.scheduledPost.create({
            data: {
              draftId: draft.id,
              platform: "X",
              externalId: tweet.id,
              scheduledAt: new Date(tweet.created_at),
              postedAt: new Date(tweet.created_at),
              status: "posted",
            },
          });

          scheduledPostId = scheduledPost.id;
        }

        await prisma.analytics.create({
          data: {
            scheduledPostId,
            platform: "X",
            externalId: tweet.id,
            impressions: m.impression_count,
            likes: m.like_count,
            retweets: m.retweet_count,
            bookmarks: m.bookmark_count,
            replies: m.reply_count,
          },
        });
        created++;
      }
    }

    emit("analytics");
    return NextResponse.json({
      success: true,
      message: `Imported ${created} new, updated ${updated} existing`,
      created,
      updated,
      total: tweets.length,
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
