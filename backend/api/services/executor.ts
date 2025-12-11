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
const DUMMY_SITES_BASE_URL =
  process.env.DUMMY_SITES_URL || "http://localhost:3001";

// Task interface for the new booking flow
interface BookingTask {
  kind: "booking" | "form_fill";
  provider_type: string;
  provider_id?: string;
  datetime_preference?: string;
  use_profile?: boolean;
}

/**
 * Main executor function - routes to specific task handlers
 */
export async function runTask(task: IntentTask | BookingTask): Promise<ExecutionResult> {
  // Handle both old (target_url) and new (provider_type) task formats
  const targetType = (task as any).provider_type || (task as any).target_url || "unknown";

  console.log(`[Executor] Running task: ${task.kind} on ${targetType}`);

  const profile = task.use_profile !== false ? getProfile() : null;

  if (!profile) {
    return {
      success: false,
      message: "No profile data available",
      error: "Profile is required but use_profile is false or profile not found",
    };
  }

  try {
    const lowerTarget = targetType.toLowerCase();

    switch (lowerTarget) {
      case "tandarts":
      case "dentist":
        return await executeDentistBooking(task, profile);

      case "event":
        return await executeEventForm(task, profile);

      default:
        return {
          success: false,
          message: `Unknown target: ${targetType}`,
          error: `No automation available for target: ${targetType}`,
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
  task: IntentTask | BookingTask,
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
  task: IntentTask | BookingTask,
  profile: { name: string; email: string; phone: string }
): Promise<ExecutionResult> {
  console.log("[Executor] Executing event form...");

  const result = await fillEventForm(
    {
      profile,
      eventName: (task as IntentTask).label,
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
 * Cleanup function
 */
export async function closeBrowser(): Promise<void> {
  console.log("[Executor] Cleanup called (no-op)");
}
