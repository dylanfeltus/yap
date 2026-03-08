import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const slots = await prisma.slotConfig.findMany({
      orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }, { platform: "asc" }],
    });
    return NextResponse.json(slots);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch slots";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (Array.isArray(body)) {
      // Batch upsert — delete slots set to 0
      const results = await Promise.all(
        body.map(async (item: {
          dayOfWeek: number;
          timeBlock: string;
          platform: string;
          targetCount: number;
          startHour: number;
          endHour: number;
        }) => {
          const uniqueWhere = {
            dayOfWeek: item.dayOfWeek,
            timeBlock: item.timeBlock,
            platform: item.platform,
          };

          if (item.targetCount <= 0) {
            // Delete slot if target is zero
            await prisma.slotConfig.deleteMany({ where: uniqueWhere });
            return { ...uniqueWhere, deleted: true };
          }

          return prisma.slotConfig.upsert({
            where: { dayOfWeek_timeBlock_platform: uniqueWhere },
            update: {
              targetCount: item.targetCount,
              startHour: item.startHour,
              endHour: item.endHour,
            },
            create: {
              ...uniqueWhere,
              targetCount: item.targetCount,
              startHour: item.startHour,
              endHour: item.endHour,
            },
          });
        })
      );
      return NextResponse.json(results, { status: 201 });
    }

    // Single upsert
    const slot = await prisma.slotConfig.upsert({
      where: {
        dayOfWeek_timeBlock_platform: {
          dayOfWeek: body.dayOfWeek,
          timeBlock: body.timeBlock,
          platform: body.platform,
        },
      },
      update: {
        targetCount: body.targetCount,
        startHour: body.startHour,
        endHour: body.endHour,
      },
      create: {
        dayOfWeek: body.dayOfWeek,
        timeBlock: body.timeBlock,
        platform: body.platform,
        targetCount: body.targetCount,
        startHour: body.startHour,
        endHour: body.endHour,
      },
    });

    return NextResponse.json(slot, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save slot";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
