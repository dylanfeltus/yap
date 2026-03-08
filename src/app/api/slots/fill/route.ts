import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDateForDay } from "@/lib/slot-utils";

export async function GET(request: NextRequest) {
  try {
    const weekParam = request.nextUrl.searchParams.get("week");
    if (!weekParam) {
      return NextResponse.json({ error: "Missing week parameter (e.g. ?week=2026-03-09)" }, { status: 400 });
    }

    const weekStart = new Date(weekParam + "T00:00:00");

    const slots = await prisma.slotConfig.findMany({
      orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }, { platform: "asc" }],
    });

    const fillStatuses = await Promise.all(
      slots.map(async (slot) => {
        const dayDate = getDateForDay(weekStart, slot.dayOfWeek);

        const dayStart = new Date(dayDate);
        dayStart.setHours(slot.startHour, 0, 0, 0);

        const dayEnd = new Date(dayDate);
        dayEnd.setHours(slot.endHour, 0, 0, 0);

        const scheduledPosts = await prisma.scheduledPost.findMany({
          where: {
            platform: slot.platform,
            scheduledAt: {
              gte: dayStart,
              lt: dayEnd,
            },
            status: { not: "failed" },
          },
          include: { draft: true },
        });

        return {
          slotId: slot.id,
          dayOfWeek: slot.dayOfWeek,
          timeBlock: slot.timeBlock,
          platform: slot.platform,
          targetCount: slot.targetCount,
          startHour: slot.startHour,
          endHour: slot.endHour,
          filledCount: scheduledPosts.length,
          scheduledPosts: scheduledPosts.map((sp) => ({
            id: sp.id,
            content: sp.draft.content,
            status: sp.status,
          })),
        };
      })
    );

    return NextResponse.json(fillStatuses);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch fill status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
