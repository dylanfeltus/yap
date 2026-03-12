import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emit } from "@/lib/events";

export async function POST() {
  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) {
    return NextResponse.json(
      { error: "X_BEARER_TOKEN not configured" },
      { status: 500 }
    );
  }

  try {
    const targets = await prisma.replyTarget.findMany({
      where: { isActive: true },
    });

    let newCandidates = 0;
    const checkedHandles: string[] = [];

    for (const target of targets) {
      checkedHandles.push(target.accountHandle);
      let keywords: string[] = [];
      try {
        const parsed = JSON.parse(target.keywords || "[]");
        keywords = Array.isArray(parsed) ? parsed : [];
      } catch {
        // Malformed keywords — treat as no filter
      }

      const query = `from:${target.accountHandle}`;
      const url = new URL("https://api.x.com/2/tweets/search/recent");
      url.searchParams.set("query", query);
      url.searchParams.set("max_results", "20");
      url.searchParams.set("tweet.fields", "public_metrics,created_at,author_id");

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${bearerToken}` },
      });

      if (!res.ok) {
        continue;
      }

      const data = await res.json();
      const tweets: Array<{
        id: string;
        text: string;
        created_at?: string;
        public_metrics?: {
          impression_count?: number;
          like_count?: number;
          retweet_count?: number;
          reply_count?: number;
        };
      }> = data.data || [];

      for (const tweet of tweets) {
        // Filter by keywords if set
        if (keywords.length > 0) {
          const text = tweet.text.toLowerCase();
          const matches = keywords.some((kw) => text.includes(kw.toLowerCase()));
          if (!matches) continue;
        }

        const metrics = tweet.public_metrics;
        try {
          await prisma.replyCandidate.upsert({
            where: { externalPostId: tweet.id },
            update: {},
            create: {
              externalPostId: tweet.id,
              authorHandle: target.accountHandle,
              authorName: target.accountName,
              content: tweet.text,
              engagement: JSON.stringify({
                views: metrics?.impression_count ?? 0,
                likes: metrics?.like_count ?? 0,
                retweets: metrics?.retweet_count ?? 0,
                replies: metrics?.reply_count ?? 0,
              }),
              platform: "X",
              replySuggestions: "[]",
              tweetedAt: tweet.created_at ? new Date(tweet.created_at) : null,
              status: "new",
            },
          });
          newCandidates++;
        } catch {
          // Ignore unique constraint race conditions
        }
      }
    }

    emit("replies");
    return NextResponse.json({ newCandidates, checkedHandles });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
