import { prisma } from "@/lib/prisma";

const X_CLIENT_ID = process.env.X_CLIENT_ID!;
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET!;
const CALLBACK_URI = "http://localhost:3333/api/auth/callback/twitter";

export interface XTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface XUserInfo {
  data: {
    id: string;
    username: string;
  };
}

/**
 * Generate the authorization URL for X OAuth 2.0
 */
export function getAuthorizationUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: X_CLIENT_ID,
    redirect_uri: CALLBACK_URI,
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "plain", // Using confidential client, not PKCE
  });

  return `https://x.com/i/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<XTokens> {
  const params = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: X_CLIENT_ID,
    redirect_uri: CALLBACK_URI,
    code_verifier: "challenge", // Match the code_challenge
  });

  const authHeader = Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString("base64");

  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${authHeader}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<XTokens> {
  const params = new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    client_id: X_CLIENT_ID,
  });

  const authHeader = Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString("base64");

  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${authHeader}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json();
}

/**
 * Get user info from X API
 */
export async function getUserInfo(accessToken: string): Promise<XUserInfo> {
  const response = await fetch("https://api.x.com/2/users/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user info: ${error}`);
  }

  return response.json();
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(): Promise<string | null> {
  const account = await prisma.xAccount.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!account) {
    return null;
  }

  // Check if token is expired (with 5 minute buffer)
  const now = new Date();
  const expiresAt = new Date(account.expiresAt);
  const bufferMs = 5 * 60 * 1000; // 5 minutes

  if (now.getTime() + bufferMs < expiresAt.getTime()) {
    // Token is still valid
    return account.accessToken;
  }

  // Token is expired or about to expire, refresh it
  try {
    const tokens = await refreshAccessToken(account.refreshToken);

    // Update the account with new tokens
    await prisma.xAccount.update({
      where: { id: account.id },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    return tokens.access_token;
  } catch (error) {
    console.error("Failed to refresh token:", error);
    // If refresh fails, the account is invalid
    await prisma.xAccount.delete({ where: { id: account.id } });
    return null;
  }
}
