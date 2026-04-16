import express from "express";
import { generateChatResponse } from "../services/groqService.js";
import { recallMemory, saveChatMessage } from "../services/hindsightService.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Recall relevant context from memory
    const memories = await recallMemory(message, 10);
    const context = memories
      .map((memory) => memory.content)
      .join("\n")
      .substring(0, 4000);

    const response = await generateChatResponse({
      message,
      context,
      history: Array.isArray(history) ? history : []
    });

    await saveChatMessage(message, response);

    res.json({
      response,
      contextUsed: memories.length > 0,
      memoryCount: memories.length
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message || "Failed to generate response" });
  }
});

export default router;
