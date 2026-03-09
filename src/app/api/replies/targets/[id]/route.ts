import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emit } from "@/lib/events";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.accountHandle !== undefined) data.accountHandle = body.accountHandle;
  if (body.accountName !== undefined) data.accountName = body.accountName;
  if (body.keywords !== undefined) data.keywords = JSON.stringify(body.keywords);
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const target = await prisma.replyTarget.update({
    where: { id },
    data,
  });

  emit("replies");
  return NextResponse.json(target);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.replyTarget.delete({ where: { id } });
  emit("replies");
  return NextResponse.json({ success: true });
}
