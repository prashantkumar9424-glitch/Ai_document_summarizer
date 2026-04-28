import type { FastifyInstance } from "fastify";
import { authSessionSchema } from "@platform/shared";

export async function authRoutes(app: FastifyInstance) {
  app.get("/auth/session", async (request) =>
    authSessionSchema.parse({
      mode: request.authContext.mode,
      accessToken: request.authContext.accessToken,
      user: request.authContext.userId
        ? {
            id: request.authContext.userId,
            email: request.authContext.email
          }
        : null
    })
  );
}
