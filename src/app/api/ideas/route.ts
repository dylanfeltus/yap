import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emit } from "@/lib/events";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const platform = searchParams.get("platform");
  const lane = searchParams.get("lane");
  const product = searchParams.get("product");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (platform) where.platform = platform;

  const ideas = await prisma.idea.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { drafts: true },
  });

  let filtered = ideas;

  if (lane) {
    filtered = filtered.filter((idea) => {
      const lanes = JSON.parse(idea.lanes) as string[];
      return lanes.includes(lane);
    });
  }

  if (product) {
    filtered = filtered.filter((idea) => {
      const products = JSON.parse(idea.products) as string[];
      return products.includes(product);
    });
  }

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (idea) =>
        idea.title.toLowerCase().includes(s) ||
        idea.notes.toLowerCase().includes(s)
    );
  }

  return NextResponse.json(filtered);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const idea = await prisma.idea.create({
    data: {
      title: body.title || "Untitled Idea",
      notes: body.notes || "",
      lanes: JSON.stringify(body.lanes || []),
      products: JSON.stringify(body.products || []),
      platform: body.platform || "Both",
      status: body.status || "idea",
    },
  });

  emit("ideas");
  return NextResponse.json(idea, { status: 201 });
}
