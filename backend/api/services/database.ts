/**
 * Database Service - Simple JSON-based storage for LifeAdmin
 *
 * Handles profile and workflow persistence.
 */

import * as fs from "fs";
import * as path from "path";
import { Profile, Workflow, Execution, WorkflowData } from "../types";

// ----- Configuration -----
const DATA_DIR = path.join(__dirname, "../../data");
const PROFILE_FILE = path.join(DATA_DIR, "profile.json");
const WORKFLOWS_FILE = path.join(DATA_DIR, "workflows.json");
const EXECUTIONS_FILE = path.join(DATA_DIR, "executions.json");

// ----- Ensure data directory exists -----
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ----- Profile Functions -----
const DEFAULT_PROFILE: Profile = {
  name: "Jan de Vries",
  email: "jan.devries@email.nl",
  phone: "06-12345678",
};

/**
 * Get the current user profile
 */
export function getProfile(): Profile {
  ensureDataDir();

  try {
    if (fs.existsSync(PROFILE_FILE)) {
      const data = fs.readFileSync(PROFILE_FILE, "utf-8");
      return JSON.parse(data) as Profile;
    }
  } catch (error) {
    console.error("[Database] Error reading profile:", error);
  }

  // Return default profile if file doesn't exist or has error
  return DEFAULT_PROFILE;
}

/**
 * Save/update the user profile
 */
export function saveProfile(profile: Profile): void {
  ensureDataDir();

  try {
    fs.writeFileSync(PROFILE_FILE, JSON.stringify(profile, null, 2));
    console.log("[Database] Profile saved");
  } catch (error) {
    console.error("[Database] Error saving profile:", error);
    throw error;
  }
}

// ----- Workflow Functions -----

/**
 * Get all workflows
 */
export function getWorkflows(): Workflow[] {
  ensureDataDir();

  try {
    if (fs.existsSync(WORKFLOWS_FILE)) {
      const data = fs.readFileSync(WORKFLOWS_FILE, "utf-8");
      return JSON.parse(data) as Workflow[];
    }
  } catch (error) {
    console.error("[Database] Error reading workflows:", error);
  }

  return [];
}

/**
 * Save workflows to file
 */
function saveWorkflows(workflows: Workflow[]): void {
  ensureDataDir();
  fs.writeFileSync(WORKFLOWS_FILE, JSON.stringify(workflows, null, 2));
}

/**
 * Create a new workflow (supports both old and new format)
 */
export function createWorkflow(params: {
  userId?: string;
  type?: "booking" | "form_fill";
  kind?: string;
  target_url?: string;
  interval?: string;
  schedule?: string; // Cron expression
  label?: string;
  data?: WorkflowData;
  use_profile?: boolean;
}): Workflow {
  const workflows = getWorkflows();
  const now = new Date();

  // Calculate next_run based on schedule or interval
  let nextRun: string | null = null;
  if (params.schedule) {
    nextRun = calculateNextRunFromCron(params.schedule, now);
  } else if (params.interval) {
    const intervalMs = parseIntervalToMs(params.interval);
    nextRun = new Date(now.getTime() + intervalMs).toISOString();
  }

  const newWorkflow: Workflow = {
    id: generateId(),
    userId: params.userId,
    type: params.type || "booking",
    kind: params.kind,
    target_url: params.target_url,
    interval: params.interval,
    schedule: params.schedule,
    label: params.label,
    data: params.data,
    last_run: null,
    next_run: nextRun,
    status: "active",
    created_at: now.toISOString(),
    use_profile: params.use_profile ?? true,
  };

  workflows.push(newWorkflow);
  saveWorkflows(workflows);

  console.log(`[Database] Workflow created: ${newWorkflow.id}`);
  return newWorkflow;
}

/**
 * Get a workflow by ID
 */
export function getWorkflowById(id: string): Workflow | null {
  const workflows = getWorkflows();
  return workflows.find((w) => w.id === id) || null;
}

/**
 * Get workflows that are due to run
 *
 * A workflow is due if:
 * - It has never run (last_run is null)
 * - The time since last_run exceeds the interval
 */
export function getDueWorkflows(now: Date = new Date()): Workflow[] {
  const workflows = getWorkflows();

  return workflows.filter((workflow) => {
    // Check if workflow has a next_run set
    if (workflow.next_run) {
      const nextRunTime = new Date(workflow.next_run);
      return now >= nextRunTime;
    }

    // Fallback: check based on last_run and interval
    if (!workflow.last_run) {
      return true; // Never run, so it's due
    }

    const lastRun = new Date(workflow.last_run);
    const intervalMs = parseIntervalToMs(workflow.interval || "P3M");
    const nextRunTime = new Date(lastRun.getTime() + intervalMs);

    return now >= nextRunTime;
  });
}

/**
 * Update the last_run timestamp for a workflow
 */
export function updateWorkflowLastRun(id: string, now: Date = new Date()): void {
  const workflows = getWorkflows();
  const index = workflows.findIndex((w) => w.id === id);

  if (index !== -1) {
    workflows[index].last_run = now.toISOString();
    saveWorkflows(workflows);
    console.log(`[Database] Updated last_run for workflow: ${id}`);
  }
}

/**
 * Delete a workflow by ID
 */
export function deleteWorkflow(id: string): boolean {
  const workflows = getWorkflows();
  const index = workflows.findIndex((w) => w.id === id);

  if (index !== -1) {
    workflows.splice(index, 1);
    saveWorkflows(workflows);
    console.log(`[Database] Deleted workflow: ${id}`);
    return true;
  }

  return false;
}

// ----- Helper Functions -----

/**
 * Generate a simple unique ID
 */
function generateId(): string {
  return `wf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Parse ISO 8601 duration to milliseconds
 * Supports: P1D, P1W, P1M, P3M, P6M, P1Y, PT1M, PT5M, PT1H
 */
function parseIntervalToMs(interval: string): number {
  const patterns: { [key: string]: number } = {
    // Period intervals
    "P1D": 24 * 60 * 60 * 1000, // 1 day
    "P1W": 7 * 24 * 60 * 60 * 1000, // 1 week
    "P2W": 14 * 24 * 60 * 60 * 1000, // 2 weeks
    "P1M": 30 * 24 * 60 * 60 * 1000, // ~1 month
    "P3M": 90 * 24 * 60 * 60 * 1000, // ~3 months
    "P6M": 180 * 24 * 60 * 60 * 1000, // ~6 months
    "P1Y": 365 * 24 * 60 * 60 * 1000, // ~1 year
    // Time intervals (for demo/testing)
    "PT1M": 60 * 1000, // 1 minute
    "PT5M": 5 * 60 * 1000, // 5 minutes
    "PT1H": 60 * 60 * 1000, // 1 hour
  };

  const ms = patterns[interval.toUpperCase()];
  if (ms) {
    return ms;
  }

  // Default to 3 months if unknown
  console.warn(`[Database] Unknown interval: ${interval}, defaulting to P3M`);
  return patterns["P3M"];
}

/**
 * Parse cron expression and calculate next run time
 * Supports: minute hour dayOfMonth month dayOfWeek
 * Example: "0 0 1 *\/3 *" = Every 3 months on the 1st at midnight
 */
function calculateNextRunFromCron(cronExpression: string, fromDate: Date = new Date()): string {
  const parts = cronExpression.split(" ");
  if (parts.length !== 5) {
    console.warn(`[Database] Invalid cron expression: ${cronExpression}`);
    // Default to 3 months from now
    return new Date(fromDate.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Simple cron parsing for common patterns
  const nextRun = new Date(fromDate);
  nextRun.setSeconds(0);
  nextRun.setMilliseconds(0);

  // Set minute
  if (minute !== "*") {
    nextRun.setMinutes(parseInt(minute, 10));
  }

  // Set hour
  if (hour !== "*") {
    nextRun.setHours(parseInt(hour, 10));
  }

  // Handle month intervals (*/3 = every 3 months)
  if (month.startsWith("*/")) {
    const interval = parseInt(month.substring(2), 10);
    const currentMonth = nextRun.getMonth();
    const nextMonth = Math.ceil((currentMonth + 1) / interval) * interval;
    nextRun.setMonth(nextMonth);
  }

  // Set day of month
  if (dayOfMonth !== "*") {
    nextRun.setDate(parseInt(dayOfMonth, 10));
  }

  // If next run is in the past, add the interval
  if (nextRun <= fromDate) {
    if (month.startsWith("*/")) {
      const interval = parseInt(month.substring(2), 10);
      nextRun.setMonth(nextRun.getMonth() + interval);
    } else {
      // Default: add 1 day
      nextRun.setDate(nextRun.getDate() + 1);
    }
  }

  return nextRun.toISOString();
}

/**
 * Mark workflow as run and update next_run
 */
export function markWorkflowRun(
  id: string,
  executedAt: Date,
  success: boolean,
  result: Record<string, unknown>
): { workflowId: string; lastRun: string; nextRun: string; status: string } | null {
  const workflows = getWorkflows();
  const index = workflows.findIndex((w) => w.id === id);

  if (index === -1) {
    return null;
  }

  const workflow = workflows[index];
  const executedAtStr = executedAt.toISOString();

  // Calculate next run
  let nextRun: string;
  if (workflow.schedule) {
    nextRun = calculateNextRunFromCron(workflow.schedule, executedAt);
  } else if (workflow.interval) {
    const intervalMs = parseIntervalToMs(workflow.interval);
    nextRun = new Date(executedAt.getTime() + intervalMs).toISOString();
  } else {
    // Default to 3 months
    nextRun = new Date(executedAt.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
  }

  // Update workflow
  workflows[index].last_run = executedAtStr;
  workflows[index].next_run = nextRun;
  saveWorkflows(workflows);

  // Save execution record
  saveExecution({
    id: `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    workflowId: id,
    userId: workflow.userId || "default",
    type: workflow.kind || workflow.type,
    result,
    success,
    executedAt: executedAtStr,
  });

  console.log(`[Database] Marked workflow ${id} as run, next run: ${nextRun}`);

  return {
    workflowId: id,
    lastRun: executedAtStr,
    nextRun,
    status: success ? "success" : "failed",
  };
}

// ----- Execution Functions -----

/**
 * Get all executions
 */
export function getExecutions(): Execution[] {
  ensureDataDir();

  try {
    if (fs.existsSync(EXECUTIONS_FILE)) {
      const data = fs.readFileSync(EXECUTIONS_FILE, "utf-8");
      return JSON.parse(data) as Execution[];
    }
  } catch (error) {
    console.error("[Database] Error reading executions:", error);
  }

  return [];
}

/**
 * Save execution to file
 */
export function saveExecution(execution: Execution): void {
  ensureDataDir();

  const executions = getExecutions();
  executions.push(execution);

  // Keep only last 100 executions
  const trimmed = executions.slice(-100);

  fs.writeFileSync(EXECUTIONS_FILE, JSON.stringify(trimmed, null, 2));
  console.log(`[Database] Execution saved: ${execution.id}`);
}

/**
 * Get executions by userId
 */
export function getExecutionsByUserId(userId: string): Execution[] {
  const executions = getExecutions();
  return executions.filter((e) => e.userId === userId);
}

/**
 * Report result - creates an execution record
 */
export function reportResult(
  userId: string,
  type: string,
  result: Record<string, unknown>,
  success: boolean = true
): Execution {
  const execution: Execution = {
    id: `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    workflowId: "manual",
    userId,
    type,
    result,
    success,
    executedAt: new Date().toISOString(),
  };

  saveExecution(execution);
  return execution;
}
