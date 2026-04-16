import "dotenv/config";
import fs from "fs";
import cors from "cors";
import express from "express";
import { FRONTEND_ORIGIN, UPLOAD_DIR } from "./config.js";
import summarizeRoute from "./routes/summarize.js";
import imageRoute from "./routes/image.js";
import chatRoute from "./routes/chat.js";

const app = express();
const allowedOrigins = FRONTEND_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.length === 0 ||
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    }
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
    hindsightConfigured: Boolean(process.env.HINDSIGHT_API_KEY)
  });
});

app.use("/api/summarize", summarizeRoute);
app.use("/api/image", imageRoute);
app.use("/api/chat", chatRoute);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const status = error.message?.includes("CORS") ? 403 : 500;
  res.status(status).json({
    error: error.message || "Internal server error"
  });
});

export default app;
