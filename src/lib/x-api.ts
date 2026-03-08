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
 * Post a tweet using X API v2
 */
export async function postTweet(text: string): Promise<string | null> {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    throw new Error("No valid X account connected");
  }

  const response = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ text }),
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
export async function postThread(parts: string[]): Promise<{ tweetIds: string[]; error?: string }> {
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
    
    const body: { text: string; reply?: { in_reply_to_tweet_id: string } } = { text };
    
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
