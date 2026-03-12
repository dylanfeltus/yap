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
  if (body.status !== undefined) data.status = body.status;
  if (body.replySuggestions !== undefined)
    data.replySuggestions = JSON.stringify(body.replySuggestions);
  if (body.status === "replied") data.repliedAt = new Date();

  const candidate = await prisma.replyCandidate.update({
    where: { id },
    data,
  });

  emit("replies");
  return NextResponse.json(candidate);
}
