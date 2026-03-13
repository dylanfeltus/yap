import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emit } from "@/lib/events";

export async function GET(request: NextRequest) {
  try {
    const weekParam = request.nextUrl.searchParams.get("week");
    if (!weekParam) {
      return NextResponse.json(
        { error: "Missing week parameter (e.g. ?week=2026-03-09)" },
        { status: 400 }
      );
    }

    const weekStart = new Date(weekParam + "T00:00:00");
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const placeholders = await prisma.slotPlaceholder.findMany({
      where: {
        weekStart: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(placeholders);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch placeholders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const placeholder = await prisma.slotPlaceholder.create({
      data: {
        slotId: body.slotId,
        weekStart: new Date(body.weekStart),
        text: body.text,
        platform: body.platform,
      },
    });

    emit("planner");
    return NextResponse.json(placeholder, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create placeholder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
