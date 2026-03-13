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

    const placeholder = await prisma.slotPlaceholder.update({
      where: { id },
      data: { text: body.text },
    });

    emit("planner");
    return NextResponse.json(placeholder);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update placeholder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.slotPlaceholder.delete({ where: { id } });

    emit("planner");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete placeholder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
