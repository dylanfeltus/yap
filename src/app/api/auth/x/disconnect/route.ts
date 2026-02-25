import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  await prisma.xAccount.deleteMany({});

  return NextResponse.json({ success: true });
}
