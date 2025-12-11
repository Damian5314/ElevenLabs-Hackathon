/**
 * Database Service - Simple JSON-based storage for LifeAdmin
 *
 * Handles profile and workflow persistence.
 */

import * as fs from "fs";
import * as path from "path";
import { Profile, Workflow } from "../types";

// ----- Configuration -----
const DATA_DIR = path.join(__dirname, "../../data");
const PROFILE_FILE = path.join(DATA_DIR, "profile.json");
const WORKFLOWS_FILE = path.join(DATA_DIR, "workflows.json");

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
 * Create a new workflow
 */
export function createWorkflow(params: {
  type: "booking" | "form_fill";
  target_url: string;
  interval: string;
  label?: string;
  use_profile?: boolean;
}): Workflow {
  const workflows = getWorkflows();

  const newWorkflow: Workflow = {
    id: generateId(),
    type: params.type,
    target_url: params.target_url,
    interval: params.interval,
    label: params.label,
    last_run: null,
    created_at: new Date().toISOString(),
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
    if (!workflow.last_run) {
      return true; // Never run, so it's due
    }

    const lastRun = new Date(workflow.last_run);
    const intervalMs = parseIntervalToMs(workflow.interval);
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
