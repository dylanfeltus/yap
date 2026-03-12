import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emit } from "@/lib/events";

export async function GET() {
  const targets = await prisma.replyTarget.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(targets);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const target = await prisma.replyTarget.create({
    data: {
      accountHandle: body.accountHandle,
      accountName: body.accountName || "",
      keywords: JSON.stringify(body.keywords || []),
      isActive: body.isActive ?? true,
    },
  });

  emit("replies");
  return NextResponse.json(target, { status: 201 });
}
