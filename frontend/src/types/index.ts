// API Response types
export interface CommandResponse {
  userTranscript: string;
  agentMessage: string;
  actionsLog: string[];
  audio: string; // base64 encoded audio
  intent?: Intent;
}

// Intent types - matches backend voice/intentParser.ts
export type IntentType = 'book_appointment' | 'fill_form_once' | 'create_recurring_task';

export interface IntentTask {
  kind: 'booking' | 'form_fill';
  target_url: string;
  interval?: string; // ISO duration like "P3M" or "PT1M"
  use_profile?: boolean;
  label?: string;
  datetime_preference?: string;
}

export interface Intent {
  type: IntentType;
  task: IntentTask;
}

// Recording states
export type RecordingState = 'idle' | 'recording' | 'processing';

// App state
export interface AppState {
  userTranscript: string;
  agentMessage: string;
  logs: string[];
  recordingState: RecordingState;
}
