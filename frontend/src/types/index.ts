// Intent types - matches backend voice/intentParser.ts
export type IntentType = 'conversation' | 'action_request' | 'confirm_action' | 'cancel_action';

export interface IntentTask {
  kind: 'booking' | 'form_fill';
  target_url: string;
  interval?: string; // ISO duration like "P3M" or "PT1M"
  use_profile?: boolean;
  label?: string;
  datetime_preference?: string;
  recurring?: boolean;
}

export interface Intent {
  type: IntentType;
  task?: IntentTask;
  response?: string;
  topic?: string;
}

// Pending action waiting for confirmation
export interface PendingAction {
  id: string;
  task: IntentTask;
  createdAt: string;
  expiresAt: string;
}

// Execution result
export interface ExecutionResult {
  success: boolean;
  message: string;
  confirmationText?: string;
  error?: string;
}

// API Response types
export interface CommandResponse {
  userTranscript: string;
  agentMessage: string;
  actionsLog: string[];
  audio: string; // base64 encoded audio
  intent?: Intent;
  pendingAction?: PendingAction;
  actionExecuted?: boolean;
  executionResult?: ExecutionResult;
}

// Recording states
export type RecordingState = 'idle' | 'recording' | 'processing';

// App state
export interface AppState {
  userTranscript: string;
  agentMessage: string;
  logs: string[];
  recordingState: RecordingState;
  pendingAction?: PendingAction;
}
