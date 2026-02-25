import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const posts = await prisma.scheduledPost.findMany({
    orderBy: { scheduledAt: "asc" },
    include: { draft: true },
  });

  return NextResponse.json(posts);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const post = await prisma.scheduledPost.create({
    data: {
      draftId: body.draftId,
      platform: body.platform,
      scheduledAt: new Date(body.scheduledAt),
      status: "queued",
    },
  });

  // Update draft status to scheduled
  await prisma.draft.update({
    where: { id: body.draftId },
    data: { status: "scheduled" },
  });

  return NextResponse.json(post, { status: 201 });
}
