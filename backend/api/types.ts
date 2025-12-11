/**
 * Shared types for LifeAdmin Backend API
 */

import { Intent, IntentTask } from "../voice";

// ----- Profile Types -----
export interface Profile {
  name: string;
  email: string;
  phone: string;
}

// ----- Workflow Types -----
export interface Workflow {
  id: string;
  type: "booking" | "form_fill";
  target_url: string;
  interval: string; // ISO duration like "P3M" or "PT1M"
  label?: string;
  last_run: string | null; // ISO date string
  created_at: string;
  use_profile: boolean;
}

// ----- Execution Types -----
export interface ExecutionResult {
  success: boolean;
  message: string;
  confirmationText?: string;
  error?: string;
}

// ----- API Request/Response Types -----
export interface CommandRequest {
  audio?: Buffer;
  text?: string; // For direct text input (testing)
}

export interface CommandResponse {
  userTranscript: string;
  intent: Intent;
  agentMessage: string;
  actionsLog: string[];
  audio: string; // base64 encoded audio
}

export interface CheckWorkflowsResponse {
  executedWorkflows: {
    id: string;
    target_url: string;
    ranAt: string;
    result: ExecutionResult;
  }[];
}

// Re-export voice types for convenience
export { Intent, IntentTask };
