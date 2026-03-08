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
  
  // Atomically claim queued posts by transitioning to "publishing" status
  // This prevents duplicate posts if multiple workers run concurrently
  const duePosts = await prisma.scheduledPost.findMany({
    where: {
      status: "queued",
      scheduledAt: {
        lte: now,
      },
    },
    select: { id: true },
    orderBy: {
      scheduledAt: "asc",
    },
  });

  const result: PublishResult = {
    published: 0,
    failed: 0,
    skipped: 0,
  };

  for (const { id } of duePosts) {
    // Atomic claim: only proceed if we successfully transition from queued → publishing
    const claimed = await prisma.scheduledPost.updateMany({
      where: { id, status: "queued" },
      data: { status: "publishing" },
    });

    if (claimed.count === 0) {
      // Another worker already claimed this post
      result.skipped++;
      continue;
    }

    try {
      await publishPost(id);
      result.published++;
    } catch (error) {
      console.error(`Failed to publish post ${id}:`, error);
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

  if (post.status !== "queued" && post.status !== "publishing") {
    throw new Error(`Post ${scheduledPostId} is not publishable (status: ${post.status})`);
  }

  const draft = post.draft;

  // Only publish to platforms we support
  if (post.platform !== "X") {
    await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: {
        status: "failed",
        error: JSON.stringify({
          message: `Publishing to ${post.platform} is not yet supported`,
          failedAt: new Date().toISOString(),
        }),
      },
    });
    throw new Error(`Publishing to ${post.platform} is not yet supported`);
  }

  try {
    let tweetIds: string[];
    
    if (draft.isThread) {
      // Parse thread parts and post as thread
      const threadParts: string[] = JSON.parse(draft.threadParts);
      
      if (!threadParts || threadParts.length === 0) {
        throw new Error("Thread has no parts");
      }

      const result = await postThread(threadParts);
      tweetIds = result.tweetIds;
      
      if (result.error && tweetIds.length === 0) {
        throw new Error(result.error);
      }
      
      // Partial success: some tweets posted but thread failed mid-way
      // Save what we have rather than retrying and duplicating early tweets
      if (result.error && tweetIds.length > 0) {
        await prisma.scheduledPost.update({
          where: { id: scheduledPostId },
          data: {
            status: "failed",
            postedAt: new Date(),
            externalId: tweetIds.join(","),
            error: JSON.stringify({
              message: `Partial thread: ${tweetIds.length}/${threadParts.length} posted. ${result.error}`,
              postedParts: tweetIds.length,
              totalParts: threadParts.length,
              failedAt: new Date().toISOString(),
            }),
          },
        });

        return tweetIds;
      }
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
      // Reset to queued so the scheduler picks it up again for retry
      await prisma.scheduledPost.update({
        where: { id: scheduledPostId },
        data: {
          status: "queued",
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
