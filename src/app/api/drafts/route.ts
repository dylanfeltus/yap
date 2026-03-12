import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emit } from "@/lib/events";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const drafts = await prisma.draft.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { idea: true, scheduledPosts: true },
  });

  return NextResponse.json(drafts);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const draft = await prisma.draft.create({
    data: {
      ideaId: body.ideaId || null,
      content: body.content || "",
      platform: body.platform || "X",
      suggestedTime: body.suggestedTime ? new Date(body.suggestedTime) : null,
      lanes: JSON.stringify(body.lanes || []),
      products: JSON.stringify(body.products || []),
      status: body.status || "draft",
      variations: JSON.stringify(body.variations || []),
      isThread: body.isThread || false,
      threadParts: JSON.stringify(body.threadParts || []),
      attachments: JSON.stringify(body.attachments || []),
    },
  });

  emit("drafts");
  emit("planner");
  return NextResponse.json(draft, { status: 201 });
}
