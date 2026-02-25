import { NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/lib/x-auth";

export async function GET() {
  // Generate a random state for CSRF protection
  const state = Math.random().toString(36).substring(7);

  // For confidential client, we use a simple code_challenge (not real PKCE)
  const codeChallenge = "challenge";

  const authUrl = getAuthorizationUrl(state, codeChallenge);

  return NextResponse.json({ url: authUrl });
}
