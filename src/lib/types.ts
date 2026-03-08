export interface Draft {
  id: string;
  ideaId: string | null;
  content: string;
  platform: string;
  suggestedTime: string | null;
  lanes: string;
  products: string;
  status: string;
  rejectionNote: string | null;
  variations: string;
  isThread: boolean;
  threadParts: string;
  attachments: string;
  createdAt: string;
  updatedAt: string;
  scheduledPosts?: ScheduledPost[];
}

export interface ScheduledPost {
  id: string;
  draftId: string;
  platform: string;
  scheduledAt: string;
  postedAt: string | null;
  externalId: string | null;
  status: string;
  error: string | null;
  createdAt: string;
  draft?: Draft;
  analytics?: Analytics[];
}

export interface Analytics {
  id: string;
  impressions: number;
  likes: number;
  retweets: number;
  bookmarks: number;
  replies: number;
  profileVisits: number;
}

export type DraftStatus = "all" | "draft" | "approved" | "scheduled" | "posted" | "rejected";

export const PLATFORM_LIMITS: Record<string, number> = {
  X: 280,
  LinkedIn: 3000,
};
