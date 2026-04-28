import type { FastifyInstance } from "fastify";
import { createChatSchema, sendMessageSchema } from "@platform/shared";
import { ChatService } from "../services/chat/chatService.js";

const chatService = new ChatService();

export async function chatRoutes(app: FastifyInstance) {
  app.get("/chats", async (request) => {
    return chatService.listChats(request.authContext.userId, request.authContext.mode, request.authContext.guestSessionId);
  });

  app.post("/chats", async (request) => {
    const body = createChatSchema.parse(request.body ?? {});
    return chatService.createChat(body, request.authContext.userId, request.authContext.mode, request.authContext.guestSessionId);
  });

  app.get("/chats/:chatId", async (request, reply) => {
    const chatId = (request.params as { chatId: string }).chatId;
    const chat = await chatService.getChat(
      chatId,
      request.authContext.userId,
      request.authContext.mode,
      request.authContext.guestSessionId
    );
    if (!chat) {
      reply.code(404);
      return { message: "Chat not found." };
    }

    return chat;
  });

  app.post("/messages", async (request) => {
    const body = sendMessageSchema.parse(request.body);
    return chatService.sendMessage(
      body,
      request.authContext.userId,
      request.authContext.mode,
      request.authContext.guestSessionId
    );
  });
}
