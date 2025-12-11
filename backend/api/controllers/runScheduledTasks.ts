/**
 * Run Scheduled Tasks Controller
 *
 * Called by n8n cron to execute due workflows.
 */

import { getDueWorkflows, updateWorkflowLastRun } from "../services/database";
import { runTask } from "../services/executor";
import { CheckWorkflowsResponse } from "../types";

/**
 * Check and execute all due workflows
 */
export async function runScheduledTasks(): Promise<CheckWorkflowsResponse> {
  const now = new Date();
  console.log(`[Scheduler] Checking for due workflows at ${now.toISOString()}`);

  const dueWorkflows = getDueWorkflows(now);
  console.log(`[Scheduler] Found ${dueWorkflows.length} due workflows`);

  const executedWorkflows: CheckWorkflowsResponse["executedWorkflows"] = [];

  for (const workflow of dueWorkflows) {
    console.log(`[Scheduler] Executing workflow: ${workflow.id}`);

    try {
      // Convert workflow to task format for executor
      const task = {
        kind: workflow.type,
        provider_type: workflow.target_url || workflow.kind || "tandarts",
        use_profile: workflow.use_profile ?? true,
        interval: workflow.interval || "P3M",
        label: workflow.label || "",
      };

      // Execute the task
      const result = await runTask(task);

      // Update last_run timestamp
      updateWorkflowLastRun(workflow.id, now);

      executedWorkflows.push({
        id: workflow.id,
        target_url: workflow.target_url || "",
        ranAt: now.toISOString(),
        result,
      });

      console.log(
        `[Scheduler] Workflow ${workflow.id} completed: ${result.success ? "success" : "failed"}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`[Scheduler] Workflow ${workflow.id} failed:`, error);

      executedWorkflows.push({
        id: workflow.id,
        target_url: workflow.target_url || "",
        ranAt: now.toISOString(),
        result: {
          success: false,
          message: "Workflow execution failed",
          error: errorMessage,
        },
      });
    }
  }

  console.log(`[Scheduler] Executed ${executedWorkflows.length} workflows`);

  return { executedWorkflows };
}
