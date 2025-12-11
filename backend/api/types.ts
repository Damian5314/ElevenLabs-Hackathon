/**
 * Shared types for LifeAdmin Backend API
 */

import { Intent, IntentTask } from "../voice";

// ----- Profile Types -----
export interface Profile {
  userId?: string;
  name: string;
  email: string;
  phone: string;
  gender?: string;
  address?: string;
  dateOfBirth?: string;
  bsn?: string;
}

// ----- Provider Types -----
export interface Provider {
  id: string;
  name: string;
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  availableSlots: string[];
  nextAvailable: string;
  specialties: string[];
  image: string;
}

export interface TimeSlot {
  date: string;
  slots: string[];
}

// ----- Workflow Types -----
export interface Workflow {
  id: string;
  userId?: string;
  type: "booking" | "form_fill";
  kind?: string; // "schedule_appointment", "fill_form", etc.
  target_url?: string;
  interval?: string; // ISO duration like "P3M" or "PT1M"
  schedule?: string; // Cron expression like "0 0 1 */3 *"
  label?: string;
  data?: WorkflowData; // Additional workflow data
  last_run: string | null; // ISO date string
  next_run?: string | null; // Calculated next run time
  status?: "active" | "paused" | "completed";
  created_at: string;
  use_profile?: boolean;
}

export interface WorkflowData {
  appointmentTitle?: string;
  appointmentDate?: string;
  appointmentEndDate?: string;
  providerUrl?: string;
  providerName?: string;
  formTitle?: string;
  formUrl?: string;
  formDate?: string;
  formEndDate?: string;
  additionalFields?: Record<string, string>;
}

// ----- Execution Types -----
export interface Execution {
  id: string;
  workflowId: string;
  userId: string;
  type: string;
  result: Record<string, unknown>;
  success: boolean;
  executedAt: string;
}

// ----- Execution Types -----
export interface ExecutionResult {
  success: boolean;
  message: string;
  confirmationText?: string;
  error?: string;
}

// ----- Booking Session State -----
export interface BookingSession {
  id: string;
  providerType: string;
  providers?: Provider[];
  selectedProvider?: Provider;
  availableSlots?: TimeSlot[];
  selectedDateTime?: {
    date: string;
    time: string;
  };
  createdAt: string;
  expiresAt: string;
}

// ----- API Request/Response Types -----
export interface CommandRequest {
  audio?: Buffer;
  text?: string;
}

export interface CommandResponse {
  userTranscript: string;
  intent: Intent;
  agentMessage: string;
  actionsLog: string[];
  audio: string; // base64 encoded audio
  // Booking flow data
  providers?: Provider[];
  selectedProvider?: Provider;
  availableSlots?: TimeSlot[];
  bookingSession?: BookingSession;
  // Action state
  actionExecuted?: boolean;
  executionResult?: ExecutionResult;
}

export interface CheckWorkflowsResponse {
  executedWorkflows: {
    id: string;
    target_url: string;
    ranAt: string;
    result: ExecutionResult;
  }[];
}

// ----- Playwright Service Types -----
export interface PlaywrightBookingRequest {
  profile: Profile;
  intent: {
    type: "schedule_appointment";
    appointmentTitle: string;
    appointmentDate: string;
    appointmentEndDate: string;
    providerUrl: string;
    providerName: string;
  };
}

export interface PlaywrightBookingResponse {
  success: boolean;
  appointmentId?: string;
  confirmationNumber?: string;
  bookedAt?: string;
  screenshot?: string; // base64
  error?: string;
}

export interface PlaywrightFormRequest {
  profile: Profile;
  intent: {
    type: "fill_form";
    formTitle: string;
    formUrl: string;
    formDate?: string;
    formEndDate?: string;
    additionalFields?: Record<string, string>;
  };
}

export interface PlaywrightFormResponse {
  success: boolean;
  formId?: string;
  submittedAt?: string;
  screenshot?: string; // base64
  error?: string;
}

// ----- Report Result Types -----
export interface ReportResultRequest {
  userId: string;
  type: string;
  result: {
    success: boolean;
    appointmentId?: string;
    calendarEventId?: string;
    timestamp?: string;
    [key: string]: unknown;
  };
}

// Re-export voice types for convenience
export { Intent, IntentTask };
