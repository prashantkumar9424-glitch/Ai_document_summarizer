import express from "express";
import { getRequestToken, requireAuth } from "../middleware/auth.js";
import {
  createGuestAccess,
  loginUser,
  registerUser,
  revokeSession
} from "../services/authService.js";

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const session = await registerUser(req.body || {});
    res.status(201).json(session);
  } catch (error) {
    res.status(400).json({ error: error.message || "Unable to create account." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const session = await loginUser(req.body || {});
    res.json(session);
  } catch (error) {
    res.status(400).json({ error: error.message || "Unable to log in." });
  }
});

router.post("/guest", async (req, res) => {
  try {
    const session = await createGuestAccess(req.body || {});
    res.status(201).json(session);
  } catch (error) {
    res.status(400).json({ error: error.message || "Unable to start guest access." });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  res.json({
    user: req.auth,
    authenticatedAt: req.authSession?.authenticatedAt,
    expiresAt: req.authSession?.expiresAt
  });
});

router.post("/logout", requireAuth, async (req, res) => {
  try {
    await revokeSession(getRequestToken(req));
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message || "Unable to log out." });
  }
});

export default router;
