import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publishPost } from "@/lib/publisher";

/**
 * POST /api/publish/now - Immediately publish a draft
 * Body: { draftId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { draftId } = body;

    if (!draftId) {
      return NextResponse.json(
        { error: "draftId is required" },
        { status: 400 }
      );
    }

    // Verify draft exists
    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      return NextResponse.json(
        { error: "Draft not found" },
        { status: 404 }
      );
    }

    // Create a scheduled post with scheduledAt = now
    const scheduledPost = await prisma.scheduledPost.create({
      data: {
        draftId,
        platform: draft.platform,
        scheduledAt: new Date(),
        status: "queued",
      },
    });

    // Publish it immediately
    const tweetIds = await publishPost(scheduledPost.id);

    return NextResponse.json({
      success: true,
      tweetIds,
      scheduledPostId: scheduledPost.id,
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
