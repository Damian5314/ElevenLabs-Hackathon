/**
 * Workflows Route - /api/workflows
 *
 * Handles workflow (recurring task) management.
 */

import { Router, Request, Response } from "express";
import {
  getWorkflows,
  getWorkflowById,
  deleteWorkflow,
  createWorkflow,
  markWorkflowRun,
  getDueWorkflows,
} from "../services/database";

const router = Router();

/**
 * GET /api/workflows
 *
 * Returns all workflows.
 */
router.get("/", (req: Request, res: Response) => {
  console.log("[API] GET /api/workflows");

  try {
    const workflows = getWorkflows();
    return res.json({
      success: true,
      count: workflows.length,
      workflows,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[API] Failed to get workflows:", error);

    return res.status(500).json({
      error: "Failed to get workflows",
      message: errorMessage,
    });
  }
});

/**
 * POST /api/workflows
 *
 * Creates a new workflow.
 * Supports both cron schedule and ISO interval formats.
 */
router.post("/", (req: Request, res: Response) => {
  console.log("[API] POST /api/workflows");

  try {
    const { userId, kind, schedule, interval, data, type, target_url, label, use_profile } = req.body;

    // Validate required fields
    if (!schedule && !interval) {
      return res.status(400).json({
        error: "Missing schedule",
        message: "Either 'schedule' (cron) or 'interval' (ISO duration) is required",
      });
    }

    const workflow = createWorkflow({
      userId,
      kind: kind || type,
      type: type || "booking",
      schedule,
      interval,
      target_url,
      label,
      data,
      use_profile,
    });

    return res.status(201).json({
      workflowId: workflow.id,
      userId: workflow.userId,
      kind: workflow.kind,
      schedule: workflow.schedule || workflow.interval,
      nextRun: workflow.next_run,
      created: workflow.created_at,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[API] Failed to create workflow:", error);

    return res.status(500).json({
      error: "Failed to create workflow",
      message: errorMessage,
    });
  }
});

/**
 * GET /api/check-due-workflows
 *
 * Returns workflows that are due to run.
 */
router.get("/check-due", (req: Request, res: Response) => {
  console.log("[API] GET /api/check-due-workflows");

  try {
    const dueWorkflows = getDueWorkflows();
    return res.json({
      dueWorkflows: dueWorkflows.map((w) => ({
        id: w.id,
        userId: w.userId,
        kind: w.kind || w.type,
        data: w.data,
      })),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[API] Failed to check due workflows:", error);

    return res.status(500).json({
      error: "Failed to check due workflows",
      message: errorMessage,
    });
  }
});

/**
 * GET /api/workflows/:id
 *
 * Returns a specific workflow by ID.
 */
router.get("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  console.log(`[API] GET /api/workflows/${id}`);

  try {
    const workflow = getWorkflowById(id);

    if (!workflow) {
      return res.status(404).json({
        error: "Workflow not found",
        message: `No workflow found with ID: ${id}`,
      });
    }

    return res.json({
      success: true,
      workflow,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[API] Failed to get workflow:", error);

    return res.status(500).json({
      error: "Failed to get workflow",
      message: errorMessage,
    });
  }
});

/**
 * DELETE /api/workflows/:id
 *
 * Deletes a workflow by ID.
 */
router.delete("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  console.log(`[API] DELETE /api/workflows/${id}`);

  try {
    const deleted = deleteWorkflow(id);

    if (!deleted) {
      return res.status(404).json({
        error: "Workflow not found",
        message: `No workflow found with ID: ${id}`,
      });
    }

    return res.json({
      success: true,
      message: `Workflow ${id} deleted successfully`,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[API] Failed to delete workflow:", error);

    return res.status(500).json({
      error: "Failed to delete workflow",
      message: errorMessage,
    });
  }
});

/**
 * POST /api/workflows/:id/mark-run
 *
 * Marks a workflow as executed and updates next_run.
 */
router.post("/:id/mark-run", (req: Request, res: Response) => {
  const { id } = req.params;
  console.log(`[API] POST /api/workflows/${id}/mark-run`);

  try {
    const { executedAt, success, result } = req.body;

    const executedDate = executedAt ? new Date(executedAt) : new Date();
    const isSuccess = success !== false; // Default to true

    const updateResult = markWorkflowRun(id, executedDate, isSuccess, result || {});

    if (!updateResult) {
      return res.status(404).json({
        error: "Workflow not found",
        message: `No workflow found with ID: ${id}`,
      });
    }

    return res.json(updateResult);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[API] Failed to mark workflow run:", error);

    return res.status(500).json({
      error: "Failed to mark workflow run",
      message: errorMessage,
    });
  }
});

export default router;
