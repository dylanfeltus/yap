import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWeekStart, getDateForDay, pickTimeInSlot } from "@/lib/slot-utils";

export async function GET(request: NextRequest) {
  try {
    const platform = request.nextUrl.searchParams.get("platform");
    if (!platform) {
      return NextResponse.json({ error: "Missing platform parameter" }, { status: 400 });
    }

    const now = new Date();
    const weekStart = getWeekStart(now);

    const slots = await prisma.slotConfig.findMany({
      where: { platform },
      orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }],
    });

    for (const slot of slots) {
      const dayDate = getDateForDay(weekStart, slot.dayOfWeek);
      const slotStart = new Date(dayDate);
      slotStart.setHours(slot.startHour, 0, 0, 0);
      const slotEnd = new Date(dayDate);
      slotEnd.setHours(slot.endHour, 0, 0, 0);

      // Skip slots in the past
      if (slotEnd <= now) continue;

      const filledCount = await prisma.scheduledPost.count({
        where: {
          platform: slot.platform,
          scheduledAt: { gte: slotStart, lt: slotEnd },
          status: { not: "failed" },
        },
      });

      if (filledCount < slot.targetCount) {
        const effectiveStart = slotStart > now ? slot.startHour : now.getHours() + 1;
        // Skip if no schedulable time remains in this slot
        if (effectiveStart >= slot.endHour) continue;
        const suggestedTime = pickTimeInSlot(dayDate, effectiveStart, slot.endHour);

        return NextResponse.json({
          slotId: slot.id,
          dayOfWeek: slot.dayOfWeek,
          timeBlock: slot.timeBlock,
          platform: slot.platform,
          suggestedTime: suggestedTime.toISOString(),
          remaining: slot.targetCount - filledCount,
        });
      }
    }

    return NextResponse.json({ message: "No available slots this week" }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to find next slot";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
