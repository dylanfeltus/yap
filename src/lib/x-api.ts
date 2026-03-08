import { getValidAccessToken } from "./x-auth";

export interface TweetMetrics {
  impression_count: number;
  like_count: number;
  retweet_count: number;
  reply_count: number;
  bookmark_count: number;
}

export interface TweetData {
  id: string;
  text: string;
  public_metrics: TweetMetrics;
}

export interface TweetResponse {
  data: TweetData;
}

/**
 * Fetch tweet analytics from X API v2
 */
export async function fetchTweetMetrics(tweetId: string): Promise<TweetMetrics | null> {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    throw new Error("No valid X account connected");
  }

  const url = `https://api.x.com/2/tweets/${tweetId}?tweet.fields=public_metrics`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to fetch tweet ${tweetId}:`, error);
    return null;
  }

  const data: TweetResponse = await response.json();
  return data.data.public_metrics;
}

/**
 * Fetch recent tweets from the authenticated user's timeline with metrics
 */
export async function fetchUserTimeline(userId: string, maxResults = 20): Promise<Array<{ id: string; text: string; created_at: string; public_metrics: TweetMetrics }>> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error("No valid X account connected");

  const url = `https://api.x.com/2/users/${userId}/tweets?max_results=${maxResults}&tweet.fields=public_metrics,created_at&exclude=retweets,replies`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to fetch timeline:", error);
    return [];
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Upload an image to X media API (v1.1)
 * Returns media_id_string on success, null on failure
 */
export async function uploadMedia(imagePath: string): Promise<string | null> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error("No valid X account connected");
  }

  const { readFile } = await import("fs/promises");
  const { join, resolve, normalize } = await import("path");

  // Prevent path traversal — ensure resolved path stays under public/uploads
  const uploadsDir = resolve(process.cwd(), "public", "uploads");
  const fullPath = resolve(process.cwd(), "public", normalize(imagePath));
  if (!fullPath.startsWith(uploadsDir)) {
    throw new Error("Invalid media path: must be within uploads directory");
  }
  const fileBuffer = await readFile(fullPath);

  const formData = new FormData();
  formData.append("media_data", fileBuffer.toString("base64"));

  const response = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to upload media:", error);
    return null;
  }

  const data: { media_id_string: string } = await response.json();
  return data.media_id_string;
}

/**
 * Post a tweet using X API v2
 */
export async function postTweet(text: string, mediaIds?: string[]): Promise<string | null> {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    throw new Error("No valid X account connected");
  }

  const body: { text: string; media?: { media_ids: string[] } } = { text };
  if (mediaIds && mediaIds.length > 0) {
    body.media = { media_ids: mediaIds };
  }

  const response = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to post tweet:", error);
    return null;
  }

  const data = await response.json();
  return data.data.id;
}

/**
 * Post a thread of tweets (replies to your own tweets)
 * Returns array of tweet IDs. If any tweet fails, returns the IDs that succeeded plus error info.
 */
export async function postThread(parts: string[], mediaIds?: string[]): Promise<{ tweetIds: string[]; error?: string }> {
  if (parts.length === 0) {
    throw new Error("Thread must have at least one part");
  }

  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error("No valid X account connected");
  }

  const tweetIds: string[] = [];
  let previousTweetId: string | null = null;

  for (let i = 0; i < parts.length; i++) {
    const text = parts[i];
    
    const body: { text: string; reply?: { in_reply_to_tweet_id: string }; media?: { media_ids: string[] } } = { text };
    
    // Attach media to the first tweet only
    if (i === 0 && mediaIds && mediaIds.length > 0) {
      body.media = { media_ids: mediaIds };
    }

    // If this isn't the first tweet, add reply parameter
    if (previousTweetId) {
      body.reply = { in_reply_to_tweet_id: previousTweetId };
    }

    const response = await fetch("https://api.x.com/2/tweets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      const errorMsg = `Failed to post tweet ${i + 1}/${parts.length}: ${error}`;
      console.error(errorMsg);
      
      // Return what we've posted so far plus the error
      return {
        tweetIds,
        error: errorMsg,
      };
    }

    const data = await response.json();
    const tweetId = data.data.id;
    tweetIds.push(tweetId);
    previousTweetId = tweetId;
  }

  return { tweetIds };
}
