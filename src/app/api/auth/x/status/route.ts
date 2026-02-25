import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const account = await prisma.xAccount.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!account) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    username: account.username,
    userId: account.userId,
  });
}
