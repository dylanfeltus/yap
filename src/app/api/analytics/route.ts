import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emit } from "@/lib/events";

export async function GET() {
  const analytics = await prisma.analytics.findMany({
    orderBy: { fetchedAt: "desc" },
    include: {
      scheduledPost: {
        include: { draft: true },
      },
    },
  });

  return NextResponse.json(analytics);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const record = await prisma.analytics.create({
    data: {
      scheduledPostId: body.scheduledPostId,
      platform: body.platform,
      externalId: body.externalId,
      impressions: body.impressions || 0,
      likes: body.likes || 0,
      retweets: body.retweets || 0,
      bookmarks: body.bookmarks || 0,
      replies: body.replies || 0,
      profileVisits: body.profileVisits || 0,
    },
  });

  emit("analytics");
  return NextResponse.json(record, { status: 201 });
}
