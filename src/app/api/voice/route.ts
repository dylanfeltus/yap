import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emit } from "@/lib/events";

export async function GET() {
  const profiles = await prisma.voiceProfile.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(profiles);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const profile = await prisma.voiceProfile.create({
    data: {
      platform: body.platform || "X",
      name: body.name || "Default",
      description: body.description || "",
      examples: JSON.stringify(body.examples || []),
    },
  });

  emit("voice");
  return NextResponse.json(profile, { status: 201 });
}
