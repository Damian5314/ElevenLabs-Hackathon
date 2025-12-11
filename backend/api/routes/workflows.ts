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

export default router;
