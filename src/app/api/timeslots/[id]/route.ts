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
  if (body.time !== undefined) data.time = body.time;
  if (body.platforms !== undefined) data.platforms = JSON.stringify(body.platforms);
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const slot = await prisma.timeSlot.update({
    where: { id },
    data,
  });

  emit("scheduler");
  return NextResponse.json(slot);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.timeSlot.delete({ where: { id } });
  emit("scheduler");
  return NextResponse.json({ success: true });
}
