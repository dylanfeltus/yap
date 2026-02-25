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
