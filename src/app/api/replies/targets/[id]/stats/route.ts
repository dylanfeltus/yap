import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const target = await prisma.replyTarget.findUnique({
      where: { id },
    });

    if (!target) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const candidates = await prisma.replyCandidate.findMany({
      where: {
        authorHandle: target.accountHandle,
        createdAt: { gte: sevenDaysAgo },
      },
    });

    const tweetCount = candidates.length;
    let totalViews = 0;
    let repliedCount = 0;

    for (const c of candidates) {
      try {
        const engagement = JSON.parse(c.engagement) as { views?: number };
        totalViews += engagement.views ?? 0;
      } catch {
        // skip malformed engagement
      }
      if (c.status === "replied") repliedCount++;
    }

    const avgViews = tweetCount > 0 ? Math.round(totalViews / tweetCount) : 0;

    return NextResponse.json({ tweetCount, avgViews, repliedCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
