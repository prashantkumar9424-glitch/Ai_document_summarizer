import type { FastifyReply, FastifyRequest } from "fastify";
import { createClient } from "@supabase/supabase-js";
import { env, flags } from "../config/env.js";

const verifyClient =
  flags.hasSupabaseAuth && env.SUPABASE_URL && env.SUPABASE_ANON_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      })
    : null;

export async function authContextHook(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const guestSessionHeader = request.headers["x-guest-session-id"];
  const guestSessionId = typeof guestSessionHeader === "string" ? guestSessionHeader : null;

  request.authContext = {
    mode: "guest",
    accessToken: null,
    userId: null,
    email: null,
    guestSessionId
  };

  if (!token) {
    return;
  }

  if (!verifyClient) {
    reply.code(503);
    throw new Error("Supabase auth is not configured on the backend.");
  }

  const { data, error } = await verifyClient.auth.getUser(token);
  if (error || !data.user) {
    reply.code(401);
    throw new Error("Invalid or expired access token.");
  }

  request.authContext = {
    mode: "authenticated",
    accessToken: token,
    userId: data.user.id,
    email: data.user.email ?? null,
    guestSessionId: null
  };
}

export function requireAuthenticatedUser(request: FastifyRequest, reply: FastifyReply) {
  if (request.authContext.mode !== "authenticated" || !request.authContext.userId) {
    reply.code(401);
    throw new Error("Authentication required.");
  }
}
