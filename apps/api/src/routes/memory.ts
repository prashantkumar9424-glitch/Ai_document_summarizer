import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { HindsightService } from "../services/memory/hindsightService.js";

const hindsight = new HindsightService();

const recallSchema = z.object({
  query: z.string().min(1),
  maxResults: z.coerce.number().int().min(1).max(10).default(6),
  chatId: z.string().optional(),
  chatTitle: z.string().optional()
});

const reflectSchema = z.object({
  query: z.string().min(1),
  chatId: z.string().optional(),
  chatTitle: z.string().optional()
});

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12),
  offset: z.coerce.number().int().min(0).default(0),
  q: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  consolidationState: z.enum(["failed", "pending", "done"]).optional()
});

const retainSchema = z.object({
  content: z.string().min(1),
  context: z.string().max(200).optional(),
  chatId: z.string().optional(),
  timestamp: z.string().optional(),
  tags: z.array(z.string().min(1).max(60)).max(12).default([]),
  metadata: z.record(z.string()).default({})
});

export async function memoryRoutes(app: FastifyInstance) {
  app.get("/memory/status", async (request) =>
    hindsight.getDetailedStatus({
      mode: request.authContext.mode,
      userId: request.authContext.userId,
      guestSessionId: request.authContext.guestSessionId,
      email: request.authContext.email
    })
  );

  app.get("/memory/list", async (request) => {
    const query = listSchema.parse(request.query ?? {});
    return hindsight.listMemories({
      mode: request.authContext.mode,
      userId: request.authContext.userId,
      guestSessionId: request.authContext.guestSessionId,
      email: request.authContext.email,
      limit: query.limit,
      offset: query.offset,
      q: query.q,
      type: query.type,
      consolidationState: query.consolidationState
    });
  });

  app.post("/memory/recall", async (request) => {
    const body = recallSchema.parse(request.body ?? {});
    const result = await hindsight.recall({
      mode: request.authContext.mode,
      userId: request.authContext.userId,
      guestSessionId: request.authContext.guestSessionId,
      email: request.authContext.email,
      query: body.query,
      shouldRecall: true,
      chatId: body.chatId,
      chatTitle: body.chatTitle,
      maxResults: body.maxResults
    });

    return {
      bankId: result.bankId,
      results: result.events,
      reflection: result.reflection,
      promptContext: result.promptContext,
      ops: result.ops
    };
  });

  app.post("/memory/reflect", async (request, reply) => {
    const body = reflectSchema.parse(request.body ?? {});
    const result = await hindsight.reflect({
      mode: request.authContext.mode,
      userId: request.authContext.userId,
      guestSessionId: request.authContext.guestSessionId,
      email: request.authContext.email,
      query: body.query,
      chatId: body.chatId,
      chatTitle: body.chatTitle
    });

    if (!result) {
      reply.code(503);
      return { message: "Hindsight reflection is unavailable." };
    }

    return result;
  });

  app.post("/memory/retain", async (request, reply) => {
    const body = retainSchema.parse(request.body ?? {});
    const retained = await hindsight.retainManual({
      mode: request.authContext.mode,
      userId: request.authContext.userId,
      guestSessionId: request.authContext.guestSessionId,
      email: request.authContext.email,
      content: body.content,
      context: body.context,
      chatId: body.chatId,
      timestamp: body.timestamp,
      tags: body.tags,
      metadata: body.metadata
    });

    if (!retained) {
      reply.code(503);
      return { message: "Hindsight retain is unavailable." };
    }

    return { success: true };
  });
}
