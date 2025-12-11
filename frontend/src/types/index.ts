// Intent types - matches backend voice/intentParser.ts
export type IntentType =
  | 'conversation'
  | 'search_providers'
  | 'select_provider'
  | 'select_datetime'
  | 'confirm_action'
  | 'cancel_action';

export interface IntentTask {
  kind: 'booking' | 'form_fill';
  provider_type: string;
  provider_id?: string;
  search_query?: string;
  interval?: string;
  use_profile?: boolean;
  label?: string;
  datetime_preference?: string;
  time_slot?: string;
  recurring?: boolean;
}

export interface Intent {
  type: IntentType;
  task?: IntentTask;
  response?: string;
  topic?: string;
  selection?: string | number;
}

// Provider types
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

// Booking session
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
  audio: string;
  intent?: Intent;
  // Booking flow data
  providers?: Provider[];
  selectedProvider?: Provider;
  availableSlots?: TimeSlot[];
  bookingSession?: BookingSession;
  // Action state
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
  providers?: Provider[];
  selectedProvider?: Provider;
  availableSlots?: TimeSlot[];
}
