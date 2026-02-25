import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const draft = await prisma.draft.findUnique({
    where: { id },
    include: { idea: true, scheduledPosts: true },
  });

  if (!draft) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(draft);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.content !== undefined) data.content = body.content;
  if (body.platform !== undefined) data.platform = body.platform;
  if (body.suggestedTime !== undefined)
    data.suggestedTime = body.suggestedTime ? new Date(body.suggestedTime) : null;
  if (body.lanes !== undefined) data.lanes = JSON.stringify(body.lanes);
  if (body.products !== undefined) data.products = JSON.stringify(body.products);
  if (body.status !== undefined) data.status = body.status;
  if (body.rejectionNote !== undefined) data.rejectionNote = body.rejectionNote;
  if (body.variations !== undefined) data.variations = JSON.stringify(body.variations);
  if (body.isThread !== undefined) data.isThread = body.isThread;
  if (body.threadParts !== undefined) data.threadParts = JSON.stringify(body.threadParts);
  if (body.attachments !== undefined) data.attachments = JSON.stringify(body.attachments);

  const draft = await prisma.draft.update({
    where: { id },
    data,
  });

  return NextResponse.json(draft);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.draft.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
