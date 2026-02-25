import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const candidates = await prisma.replyCandidate.findMany({
    where,
    orderBy: { createdAt: "desc" },
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
      status: "new",
    },
  });

  return NextResponse.json(candidate, { status: 201 });
}
