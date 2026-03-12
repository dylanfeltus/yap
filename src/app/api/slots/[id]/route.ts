import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emit } from "@/lib/events";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const slot = await prisma.slotConfig.update({
      where: { id },
      data: { targetCount: body.targetCount },
    });

    emit("slots");
    emit("planner");
    return NextResponse.json(slot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update slot";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.slotConfig.delete({ where: { id } });
    emit("slots");
    emit("planner");
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete slot";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
