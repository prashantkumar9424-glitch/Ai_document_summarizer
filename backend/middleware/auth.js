import { getSessionFromToken } from "../services/authService.js";

function extractBearerToken(headerValue = "") {
  if (!headerValue.startsWith("Bearer ")) {
    return "";
  }

  return headerValue.slice(7).trim();
}

export function getRequestToken(req) {
  return extractBearerToken(req.get("authorization") || "");
}

export async function requireAuth(req, res, next) {
  try {
    const token = getRequestToken(req);

    if (!token) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const session = await getSessionFromToken(token);

    if (!session) {
      return res.status(401).json({ error: "Your session is invalid or has expired." });
    }

    req.auth = session.user;
    req.authSession = session;
    next();
  } catch (error) {
    next(error);
  }
}
