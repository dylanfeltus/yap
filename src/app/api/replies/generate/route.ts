import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "AI reply generation not yet implemented" },
    { status: 501 }
  );
}
