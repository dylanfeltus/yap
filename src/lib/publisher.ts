import { prisma } from "@/lib/prisma";
import { postTweet, postThread } from "@/lib/x-api";

interface PublishResult {
  published: number;
  failed: number;
  skipped: number;
}

const MAX_RETRIES = 3;

/**
 * Publish all scheduled posts that are due
 */
export async function publishScheduledPosts(): Promise<PublishResult> {
  const now = new Date();
  
  const duePosts = await prisma.scheduledPost.findMany({
    where: {
      status: "queued",
      scheduledAt: {
        lte: now,
      },
    },
    include: {
      draft: true,
    },
    orderBy: {
      scheduledAt: "asc",
    },
  });

  const result: PublishResult = {
    published: 0,
    failed: 0,
    skipped: 0,
  };

  for (const post of duePosts) {
    try {
      await publishPost(post.id);
      result.published++;
    } catch (error) {
      console.error(`Failed to publish post ${post.id}:`, error);
      result.failed++;
    }
  }

  return result;
}

/**
 * Publish a single scheduled post
 */
export async function publishPost(scheduledPostId: string): Promise<string[]> {
  const post = await prisma.scheduledPost.findUnique({
    where: { id: scheduledPostId },
    include: { draft: true },
  });

  if (!post) {
    throw new Error(`Scheduled post ${scheduledPostId} not found`);
  }

  if (post.status !== "queued") {
    throw new Error(`Post ${scheduledPostId} is not queued (status: ${post.status})`);
  }

  const draft = post.draft;

  try {
    let tweetIds: string[];
    
    if (draft.isThread) {
      // Parse thread parts and post as thread
      const threadParts: string[] = JSON.parse(draft.threadParts);
      
      if (!threadParts || threadParts.length === 0) {
        throw new Error("Thread has no parts");
      }

      const result = await postThread(threadParts);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      tweetIds = result.tweetIds;
    } else {
      // Post single tweet
      const tweetId = await postTweet(draft.content);
      
      if (!tweetId) {
        throw new Error("Failed to post tweet (no ID returned)");
      }
      
      tweetIds = [tweetId];
    }

    // Update post status to posted
    await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: {
        status: "posted",
        postedAt: new Date(),
        externalId: tweetIds.join(","), // Store all tweet IDs comma-separated
        error: null,
      },
    });

    // Update draft status
    await prisma.draft.update({
      where: { id: draft.id },
      data: {
        status: "posted",
      },
    });

    return tweetIds;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Get current retry count (stored in error field as JSON)
    let retryCount = 0;
    if (post.error) {
      try {
        const errorData = JSON.parse(post.error);
        retryCount = errorData.retryCount || 0;
      } catch {
        // If error field is not JSON, reset retry count
        retryCount = 0;
      }
    }

    retryCount++;

    if (retryCount >= MAX_RETRIES) {
      // Permanently failed
      await prisma.scheduledPost.update({
        where: { id: scheduledPostId },
        data: {
          status: "failed",
          error: JSON.stringify({
            message: errorMessage,
            retryCount,
            failedAt: new Date().toISOString(),
          }),
        },
      });

      await prisma.draft.update({
        where: { id: draft.id },
        data: {
          status: "rejected",
          rejectionNote: `Publishing failed after ${MAX_RETRIES} attempts: ${errorMessage}`,
        },
      });
    } else {
      // Update with retry count, keep status as queued
      await prisma.scheduledPost.update({
        where: { id: scheduledPostId },
        data: {
          error: JSON.stringify({
            message: errorMessage,
            retryCount,
            lastAttempt: new Date().toISOString(),
          }),
        },
      });
    }

    throw error;
  }
}
