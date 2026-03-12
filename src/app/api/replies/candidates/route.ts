import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emit } from "@/lib/events";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  // Auto-filter: only show candidates tweeted in the last 24h
  where.OR = [
    { tweetedAt: { gte: twentyFourHoursAgo } },
    { tweetedAt: null, createdAt: { gte: twentyFourHoursAgo } },
  ];

  const candidates = await prisma.replyCandidate.findMany({
    where,
    orderBy: [{ tweetedAt: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(candidates);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const candidate = await prisma.replyCandidate.create({
    data: {
      externalPostId: body.externalPostId,
      authorHandle: body.authorHandle,
      authorName: body.authorName || "",
      content: body.content,
      engagement: JSON.stringify(body.engagement || {}),
      platform: body.platform || "X",
      replySuggestions: JSON.stringify(body.replySuggestions || []),
      tweetedAt: body.tweetedAt ? new Date(body.tweetedAt) : null,
      status: "new",
    },
  });

  emit("replies");
  return NextResponse.json(candidate, { status: 201 });
}
