/**
 * Check Workflows Route - GET /api/check-workflows
 *
 * Called by n8n cron to trigger scheduled workflow execution.
 */

import { Router, Request, Response } from "express";
import { runScheduledTasks } from "../controllers/runScheduledTasks";

const router = Router();

/**
 * GET /api/check-workflows
 *
 * Checks for due workflows and executes them.
 * Returns a summary of executed workflows.
 */
router.get("/", async (req: Request, res: Response) => {
  console.log("[API] GET /api/check-workflows received");

  try {
    const result = await runScheduledTasks();

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[API] Check workflows failed:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to check workflows",
      message: errorMessage,
    });
  }
});

export default router;
