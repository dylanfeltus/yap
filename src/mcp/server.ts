#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { prisma } from "../lib/prisma.js";
import { publishPost } from "../lib/publisher.js";
import { getWeekStart, getDateForDay, pickTimeInSlot } from "../lib/slot-utils.js";
import { emit } from "../lib/events.js";

const server = new Server(
  {
    name: "yap-social",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define all tools
const tools: Tool[] = [
  {
    name: "create_draft",
    description: "Create a new draft post for social media. Returns the draft ID and content.",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The content of the post",
        },
        platform: {
          type: "string",
          enum: ["X", "LinkedIn"],
          description: "Platform to post to (default: X)",
        },
        isThread: {
          type: "boolean",
          description: "Whether this is a thread (default: false)",
        },
        threadParts: {
          type: "array",
          items: { type: "string" },
          description: "Array of thread parts if isThread is true",
        },
        lanes: {
          type: "array",
          items: { type: "string" },
          description: "Content lanes/categories",
        },
        products: {
          type: "array",
          items: { type: "string" },
          description: "Products mentioned in the post",
        },
        attachments: {
          type: "array",
          items: { type: "string" },
          description: "Array of image URLs/paths to attach (max 4 for X)",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "list_drafts",
    description: "List drafts, optionally filtered by status. Returns most recent first.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Filter by status (draft, approved, scheduled, posted, rejected)",
        },
        limit: {
          type: "number",
          description: "Maximum number of drafts to return (default: 20)",
        },
      },
    },
  },
  {
    name: "update_draft",
    description: "Update a draft. If status changes to 'approved', the draft is ready to publish.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Draft ID",
        },
        content: {
          type: "string",
          description: "Updated content",
        },
        status: {
          type: "string",
          description: "New status (draft, approved, scheduled, posted, rejected)",
        },
        threadParts: {
          type: "array",
          items: { type: "string" },
          description: "Updated thread parts",
        },
        attachments: {
          type: "array",
          items: { type: "string" },
          description: "Updated image attachment URLs/paths (max 4 for X)",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "schedule_draft",
    description: "Schedule a draft to be published at a specific time. Updates draft status to 'scheduled'.",
    inputSchema: {
      type: "object",
      properties: {
        draftId: {
          type: "string",
          description: "Draft ID",
        },
        scheduledAt: {
          type: "string",
          description: "ISO datetime when to publish (e.g., 2024-03-15T14:30:00Z)",
        },
      },
      required: ["draftId", "scheduledAt"],
    },
  },
  {
    name: "publish_now",
    description: "Immediately publish a draft to X (bypasses scheduler). Returns tweet ID(s).",
    inputSchema: {
      type: "object",
      properties: {
        draftId: {
          type: "string",
          description: "Draft ID to publish",
        },
      },
      required: ["draftId"],
    },
  },
  {
    name: "get_analytics",
    description: "Get analytics for posts. Can fetch specific post or recent posts.",
    inputSchema: {
      type: "object",
      properties: {
        postId: {
          type: "string",
          description: "Specific scheduled post ID (optional)",
        },
        limit: {
          type: "number",
          description: "Number of recent posts to get analytics for (default: 10)",
        },
      },
    },
  },
  {
    name: "list_reply_candidates",
    description: "List reply candidates from the Reply Guy pipeline.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Filter by status (new, replied, skipped)",
        },
        limit: {
          type: "number",
          description: "Maximum number to return (default: 20)",
        },
      },
    },
  },
  {
    name: "add_reply_target",
    description: "Add an account to the Reply Guy watchlist.",
    inputSchema: {
      type: "object",
      properties: {
        accountHandle: {
          type: "string",
          description: "Twitter/X handle (without @)",
        },
        keywords: {
          type: "array",
          items: { type: "string" },
          description: "Keywords to watch for in their tweets",
        },
      },
      required: ["accountHandle"],
    },
  },
  {
    name: "get_weekly_plan",
    description: "Get the current week's slot fill status — shows how many posts are scheduled vs. target for each time block and platform.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_next_slot",
    description: "Get the next available (unfilled) slot time for a platform. Returns a suggested scheduling time.",
    inputSchema: {
      type: "object",
      properties: {
        platform: {
          type: "string",
          enum: ["X", "LinkedIn"],
          description: "Platform to find next slot for",
        },
      },
      required: ["platform"],
    },
  },
  {
    name: "get_voice_profile",
    description: "Get voice profile(s) to help write in the right voice.",
    inputSchema: {
      type: "object",
      properties: {
        platform: {
          type: "string",
          description: "Filter by platform (X or LinkedIn)",
        },
      },
    },
  },
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: "Missing arguments" }, null, 2),
        },
      ],
      isError: true,
    };
  }

  try {
    switch (name) {
      case "create_draft": {
        const draft = await prisma.draft.create({
          data: {
            content: args.content as string,
            platform: (args.platform as string) || "X",
            isThread: (args.isThread as boolean) || false,
            threadParts: JSON.stringify(args.threadParts || []),
            lanes: JSON.stringify(args.lanes || []),
            products: JSON.stringify(args.products || []),
            attachments: JSON.stringify(((args.attachments as string[]) || []).slice(0, 4)),
            status: "draft",
          },
        });

        emit("drafts");
        emit("planner");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                id: draft.id,
                content: draft.content,
                platform: draft.platform,
                isThread: draft.isThread,
                status: draft.status,
                createdAt: draft.createdAt,
              }, null, 2),
            },
          ],
        };
      }

      case "list_drafts": {
        const where: Record<string, unknown> = {};
        if (args.status) {
          where.status = args.status;
        }

        const drafts = await prisma.draft.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: (args.limit as number) || 20,
          include: {
            idea: true,
            scheduledPosts: true,
          },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(drafts.map(d => ({
                id: d.id,
                content: d.content,
                platform: d.platform,
                status: d.status,
                isThread: d.isThread,
                threadParts: JSON.parse(d.threadParts),
                lanes: JSON.parse(d.lanes),
                products: JSON.parse(d.products),
                createdAt: d.createdAt,
                scheduledPosts: d.scheduledPosts,
              })), null, 2),
            },
          ],
        };
      }

      case "update_draft": {
        const updateData: Record<string, unknown> = {};
        
        if (args.content !== undefined) {
          updateData.content = args.content;
        }
        if (args.status !== undefined) {
          updateData.status = args.status;
        }
        if (args.threadParts !== undefined) {
          updateData.threadParts = JSON.stringify(args.threadParts);
        }
        if (args.attachments !== undefined) {
          updateData.attachments = JSON.stringify((args.attachments as string[]).slice(0, 4));
        }

        const draft = await prisma.draft.update({
          where: { id: args.id as string },
          data: updateData,
        });

        emit("drafts");
        emit("planner");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                id: draft.id,
                content: draft.content,
                status: draft.status,
                updatedAt: draft.updatedAt,
              }, null, 2),
            },
          ],
        };
      }

      case "schedule_draft": {
        const scheduledAt = new Date(args.scheduledAt as string);
        
        const draft = await prisma.draft.findUnique({
          where: { id: args.draftId as string },
        });

        if (!draft) {
          throw new Error("Draft not found");
        }

        const post = await prisma.scheduledPost.create({
          data: {
            draftId: args.draftId as string,
            platform: draft.platform,
            scheduledAt,
            status: "queued",
          },
        });

        await prisma.draft.update({
          where: { id: args.draftId as string },
          data: { status: "scheduled" },
        });

        emit("scheduler");
        emit("drafts");
        emit("planner");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                scheduledPostId: post.id,
                draftId: post.draftId,
                scheduledAt: post.scheduledAt,
                status: post.status,
              }, null, 2),
            },
          ],
        };
      }

      case "publish_now": {
        const draft = await prisma.draft.findUnique({
          where: { id: args.draftId as string },
        });

        if (!draft) {
          throw new Error("Draft not found");
        }

        // Create scheduled post with scheduledAt = now
        const scheduledPost = await prisma.scheduledPost.create({
          data: {
            draftId: args.draftId as string,
            platform: draft.platform,
            scheduledAt: new Date(),
            status: "queued",
          },
        });

        // Publish immediately
        const tweetIds = await publishPost(scheduledPost.id);

        emit("drafts");
        emit("scheduler");
        emit("planner");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                tweetIds,
                scheduledPostId: scheduledPost.id,
              }, null, 2),
            },
          ],
        };
      }

      case "get_analytics": {
        if (args.postId) {
          // Get analytics for specific post
          const analytics = await prisma.analytics.findMany({
            where: { scheduledPostId: args.postId as string },
            orderBy: { fetchedAt: "desc" },
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(analytics, null, 2),
              },
            ],
          };
        } else {
          // Get summary + recent posts with analytics
          const allAnalytics = await prisma.analytics.findMany({
            include: {
              scheduledPost: {
                include: { draft: true },
              },
            },
            orderBy: { fetchedAt: "desc" },
          });

          const totalImpressions = allAnalytics.reduce((s, a) => s + a.impressions, 0);
          const totalLikes = allAnalytics.reduce((s, a) => s + a.likes, 0);
          const totalRetweets = allAnalytics.reduce((s, a) => s + a.retweets, 0);
          const totalReplies = allAnalytics.reduce((s, a) => s + a.replies, 0);
          const totalEngagements = totalLikes + totalRetweets + totalReplies;
          const avgEngagementRate = totalImpressions > 0
            ? Number(((totalEngagements / totalImpressions) * 100).toFixed(2))
            : 0;

          const limit = (args.limit as number) || 10;
          const recentPosts = allAnalytics.slice(0, limit).map(a => ({
            id: a.scheduledPost.id,
            content: a.scheduledPost.draft.content,
            platform: a.platform,
            postedAt: a.scheduledPost.postedAt,
            externalId: a.scheduledPost.externalId,
            impressions: a.impressions,
            likes: a.likes,
            retweets: a.retweets,
            replies: a.replies,
          }));

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  summary: {
                    totalPosts: allAnalytics.length,
                    totalImpressions,
                    totalLikes,
                    totalRetweets,
                    totalReplies,
                    totalEngagements,
                    avgEngagementRate,
                  },
                  recentPosts,
                }, null, 2),
              },
            ],
          };
        }
      }

      case "list_reply_candidates": {
        const where: Record<string, unknown> = {};
        if (args.status) {
          where.status = args.status;
        }

        const candidates = await prisma.replyCandidate.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: (args.limit as number) || 20,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(candidates.map(c => ({
                id: c.id,
                externalPostId: c.externalPostId,
                authorHandle: c.authorHandle,
                authorName: c.authorName,
                content: c.content,
                engagement: JSON.parse(c.engagement),
                status: c.status,
                replySuggestions: JSON.parse(c.replySuggestions),
                createdAt: c.createdAt,
              })), null, 2),
            },
          ],
        };
      }

      case "add_reply_target": {
        const target = await prisma.replyTarget.create({
          data: {
            accountHandle: args.accountHandle as string,
            keywords: JSON.stringify(args.keywords || []),
          },
        });

        emit("replies");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                id: target.id,
                accountHandle: target.accountHandle,
                keywords: JSON.parse(target.keywords),
                isActive: target.isActive,
              }, null, 2),
            },
          ],
        };
      }

      case "get_weekly_plan": {
        const now = new Date();
        const weekStart = getWeekStart(now);
        const slots = await prisma.slotConfig.findMany({
          orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }, { platform: "asc" }],
        });

        const fillStatuses = await Promise.all(
          slots.map(async (slot) => {
            const dayDate = getDateForDay(weekStart, slot.dayOfWeek);
            const slotStart = new Date(dayDate);
            slotStart.setHours(slot.startHour, 0, 0, 0);
            const slotEnd = new Date(dayDate);
            slotEnd.setHours(slot.endHour, 0, 0, 0);

            const count = await prisma.scheduledPost.count({
              where: {
                platform: slot.platform,
                scheduledAt: { gte: slotStart, lt: slotEnd },
                status: { not: "failed" },
              },
            });

            return {
              dayOfWeek: slot.dayOfWeek,
              timeBlock: slot.timeBlock,
              platform: slot.platform,
              targetCount: slot.targetCount,
              filledCount: count,
              remaining: Math.max(0, slot.targetCount - count),
            };
          })
        );

        return {
          content: [{ type: "text", text: JSON.stringify({ weekStart: weekStart.toISOString(), slots: fillStatuses }, null, 2) }],
        };
      }

      case "get_next_slot": {
        const platform = args.platform as string;
        const now2 = new Date();
        const ws = getWeekStart(now2);
        const slots2 = await prisma.slotConfig.findMany({
          where: { platform },
          orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }],
        });

        for (const slot of slots2) {
          const dayDate = getDateForDay(ws, slot.dayOfWeek);
          const slotStart = new Date(dayDate);
          slotStart.setHours(slot.startHour, 0, 0, 0);
          const slotEnd = new Date(dayDate);
          slotEnd.setHours(slot.endHour, 0, 0, 0);

          if (slotEnd <= now2) continue;

          const filled = await prisma.scheduledPost.count({
            where: {
              platform: slot.platform,
              scheduledAt: { gte: slotStart, lt: slotEnd },
              status: { not: "failed" },
            },
          });

          if (filled < slot.targetCount) {
            const effectiveStart = slotStart > now2 ? slot.startHour : now2.getHours() + 1;
            const suggestedTime = pickTimeInSlot(dayDate, effectiveStart, slot.endHour);

            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  dayOfWeek: slot.dayOfWeek,
                  timeBlock: slot.timeBlock,
                  platform: slot.platform,
                  suggestedTime: suggestedTime.toISOString(),
                  remaining: slot.targetCount - filled,
                }, null, 2),
              }],
            };
          }
        }

        return {
          content: [{ type: "text", text: JSON.stringify({ message: "No available slots this week for " + platform }) }],
        };
      }

      case "get_voice_profile": {
        const where: Record<string, unknown> = {};
        if (args.platform) {
          where.platform = args.platform;
        }

        const profiles = await prisma.voiceProfile.findMany({
          where,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(profiles.map(p => ({
                id: p.id,
                platform: p.platform,
                name: p.name,
                description: p.description,
                examples: JSON.parse(p.examples),
              })), null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: errorMessage }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Yap MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
