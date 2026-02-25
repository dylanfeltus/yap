import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.scheduledAt !== undefined) data.scheduledAt = new Date(body.scheduledAt);
  if (body.status !== undefined) data.status = body.status;
  if (body.error !== undefined) data.error = body.error;
  if (body.postedAt !== undefined) data.postedAt = new Date(body.postedAt);
  if (body.externalId !== undefined) data.externalId = body.externalId;

  const post = await prisma.scheduledPost.update({
    where: { id },
    data,
  });

  return NextResponse.json(post);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const post = await prisma.scheduledPost.findUnique({ where: { id } });

  if (post) {
    await prisma.scheduledPost.delete({ where: { id } });
    // Revert draft status
    await prisma.draft.update({
      where: { id: post.draftId },
      data: { status: "approved" },
    });
  }

  return NextResponse.json({ success: true });
}
