/**
 * Executor Service - Handles Playwright browser automation
 *
 * Routes tasks to the appropriate automation scripts.
 */

import { IntentTask, ExecutionResult } from "../types";
import { getProfile } from "./database";
import { bookDentistAppointment } from "../../automation/dentistBooking";
import { fillEventForm } from "../../automation/eventForm";

// ----- Configuration -----
// Dummy sites are now served from the same Express server
const DUMMY_SITES_BASE_URL =
  process.env.DUMMY_SITES_URL || "http://localhost:3001";

/**
 * Main executor function - routes to specific task handlers
 */
export async function runTask(task: IntentTask): Promise<ExecutionResult> {
  console.log(`[Executor] Running task: ${task.kind} on ${task.target_url}`);

  const profile = task.use_profile !== false ? getProfile() : null;

  if (!profile) {
    return {
      success: false,
      message: "No profile data available",
      error: "Profile is required but use_profile is false or profile not found",
    };
  }

  try {
    switch (task.target_url.toLowerCase()) {
      case "tandarts":
      case "dentist":
        return await executeDentistBooking(task, profile);

      case "event":
        return await executeEventForm(task, profile);

      default:
        return {
          success: false,
          message: `Unknown target: ${task.target_url}`,
          error: `No automation available for target: ${task.target_url}`,
        };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`[Executor] Task failed:`, error);

    return {
      success: false,
      message: "Task execution failed",
      error: errorMessage,
    };
  }
}

/**
 * Execute dentist booking via Playwright
 */
async function executeDentistBooking(
  task: IntentTask,
  profile: { name: string; email: string; phone: string }
): Promise<ExecutionResult> {
  console.log("[Executor] Executing dentist booking...");

  const result = await bookDentistAppointment(
    {
      profile,
      datetime_preference: task.datetime_preference,
      headless: process.env.HEADLESS !== "false",
    },
    DUMMY_SITES_BASE_URL
  );

  return {
    success: result.success,
    message: result.message,
    confirmationText: result.confirmationText,
    error: result.error,
  };
}

/**
 * Execute event form via Playwright
 */
async function executeEventForm(
  task: IntentTask,
  profile: { name: string; email: string; phone: string }
): Promise<ExecutionResult> {
  console.log("[Executor] Executing event form...");

  const result = await fillEventForm(
    {
      profile,
      eventName: task.label,
      headless: process.env.HEADLESS !== "false",
    },
    DUMMY_SITES_BASE_URL
  );

  return {
    success: result.success,
    message: result.message,
    confirmationText: result.confirmationText,
    error: result.error,
  };
}

/**
 * Cleanup function (no-op since automation scripts manage their own browsers)
 */
export async function closeBrowser(): Promise<void> {
  // The automation scripts handle browser lifecycle themselves
  console.log("[Executor] Cleanup called (no-op)");
}
