import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idea = await prisma.idea.findUnique({
    where: { id },
    include: { drafts: true },
  });

  if (!idea) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(idea);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.lanes !== undefined) data.lanes = JSON.stringify(body.lanes);
  if (body.products !== undefined) data.products = JSON.stringify(body.products);
  if (body.platform !== undefined) data.platform = body.platform;
  if (body.status !== undefined) data.status = body.status;

  const idea = await prisma.idea.update({
    where: { id },
    data,
  });

  return NextResponse.json(idea);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.idea.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
