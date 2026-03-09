import { NextResponse } from "next/server";
import { publishScheduledPosts } from "@/lib/publisher";
import { emit } from "@/lib/events";

/**
 * POST /api/publish - Trigger publishing of all due scheduled posts
 * Called by cron job or interval worker
 */
export async function POST() {
  try {
    const result = await publishScheduledPosts();
    
    emit("drafts");
    emit("scheduler");
    emit("planner");
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
