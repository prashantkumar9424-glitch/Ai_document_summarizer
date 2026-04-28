import type { UserMode } from "@platform/shared";

declare module "fastify" {
  interface FastifyRequest {
    authContext: {
      mode: UserMode;
      accessToken: string | null;
      userId: string | null;
      email: string | null;
      guestSessionId: string | null;
    };
  }
}

export {};
