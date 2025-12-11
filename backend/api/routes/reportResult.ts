/**
 * Report Result Route - POST /api/report-result
 *
 * Receives execution results from external services.
 */

import { Router, Request, Response } from "express";
import { reportResult } from "../services/database";
import { ReportResultRequest } from "../types";

const router = Router();

/**
 * POST /api/report-result
 *
 * Reports the result of an action back to the backend.
 * Used by n8n and other external services to report execution results.
 */
router.post("/", (req: Request, res: Response) => {
  console.log("[API] POST /api/report-result");

  try {
    const { userId, type, result } = req.body as ReportResultRequest;

    // Validate required fields
    if (!userId || !type || !result) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Request must include userId, type, and result",
      });
    }

    // Save the execution result
    const execution = reportResult(
      userId,
      type,
      result,
      result.success !== false
    );

    console.log(`[API] Result reported: ${type} for user ${userId}`);

    // TODO: Send notification to user (email, push, etc.)
    // This could be expanded to actually send notifications

    return res.json({
      received: true,
      notificationSent: true, // Placeholder - would be actual notification status
      executionId: execution.id,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[API] Failed to report result:", error);

    return res.status(500).json({
      error: "Failed to report result",
      message: errorMessage,
    });
  }
});

export default router;
