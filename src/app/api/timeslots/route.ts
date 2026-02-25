import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const slots = await prisma.timeSlot.findMany({
    orderBy: { time: "asc" },
  });

  return NextResponse.json(slots);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const slot = await prisma.timeSlot.create({
    data: {
      time: body.time,
      platforms: JSON.stringify(body.platforms || ["X", "LinkedIn"]),
      isActive: body.isActive ?? true,
    },
  });

  return NextResponse.json(slot, { status: 201 });
}
