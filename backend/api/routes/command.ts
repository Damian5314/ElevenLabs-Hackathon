/**
 * Command Route - POST /api/command
 *
 * Handles voice/text commands from the frontend.
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import {
  handleAudioCommand,
  handleTextCommand,
} from "../controllers/handleCommand";

const router = Router();

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

/**
 * POST /api/command
 *
 * Accepts either:
 * - multipart/form-data with 'audio' file field
 * - application/json with { text: string } for direct text input
 */
router.post("/", upload.single("audio"), async (req: Request, res: Response) => {
  console.log("[API] POST /api/command received");

  try {
    // Check if audio file was uploaded
    if (req.file) {
      console.log(
        `[API] Audio file received: ${req.file.originalname}, size: ${req.file.size} bytes`
      );

      const response = await handleAudioCommand(req.file.buffer);
      return res.json(response);
    }

    // Check if text was sent directly (for testing)
    if (req.body && req.body.text) {
      console.log(`[API] Text command received: "${req.body.text}"`);

      const response = await handleTextCommand(req.body.text);
      return res.json(response);
    }

    // No valid input
    return res.status(400).json({
      error: "No audio file or text provided",
      message:
        "Send either an audio file in 'audio' field or JSON with 'text' property",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[API] Command processing failed:", error);

    return res.status(500).json({
      error: "Internal server error",
      message: errorMessage,
    });
  }
});

export default router;
