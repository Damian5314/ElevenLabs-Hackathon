/**
 * Voice & Intent Module - LifeAdmin
 *
 * Central export for all voice-related functionality.
 *
 * Usage by orchestrator:
 * ```ts
 * import {
 *   transcribeAudio,
 *   extractIntent,
 *   generateSpeech,
 *   audioBufferToBase64,
 *   RESPONSE_TEMPLATES
 * } from './voice';
 *
 * // Full flow:
 * const transcript = await transcribeAudio(audioBuffer);
 * const intent = await extractIntent(transcript);
 * // ... execute Playwright action ...
 * const audio = await generateSpeech(agentMessage);
 * const audioBase64 = audioBufferToBase64(audio);
 * ```
 *
 * Required ENV variables:
 * - OPENAI_API_KEY: Required for STT (Whisper) and Intent parsing (GPT)
 * - ELEVENLABS_API_KEY: Required for TTS
 * - STT_PROVIDER: Optional, "whisper" (default) or "elevenlabs"
 * - ELEVENLABS_VOICE_ID: Optional, defaults to Rachel voice
 */

// ----- STT Exports -----
export { transcribeAudio, STTError } from "./stt";

// ----- Intent Parser Exports -----
export {
  extractIntent,
  describeIntent,
  IntentParseError,
  // Types
  type Intent,
  type IntentTask,
  type IntentType,
} from "./intentParser";

// ----- TTS Exports -----
export {
  generateSpeech,
  generateSpeechWithMetadata,
  audioBufferToBase64,
  TTSError,
  RESPONSE_TEMPLATES,
  // Types
  type TTSResponse,
} from "./tts";

// ----- Combined Types for API Response -----
export interface VoiceCommandResult {
  /** Original user transcript from STT */
  userTranscript: string;
  /** Extracted intent from LLM */
  intent: import("./intentParser").Intent;
  /** Log of actions performed */
  actionsLog: string[];
  /** Agent's text response */
  agentMessage: string;
  /** Base64 encoded audio response */
  audio: string;
}

/**
 * Helper to build a complete VoiceCommandResult.
 *
 * @example
 * ```ts
 * const result = buildVoiceCommandResult({
 *   userTranscript: "Maak een tandartsafspraak",
 *   intent: extractedIntent,
 *   actionsLog: ["Intent: book_appointment", "Formulier ingevuld"],
 *   agentMessage: "Je afspraak is geboekt!",
 *   audioBuffer: generatedAudio
 * });
 * ```
 */
export function buildVoiceCommandResult(params: {
  userTranscript: string;
  intent: import("./intentParser").Intent;
  actionsLog: string[];
  agentMessage: string;
  audioBuffer: Buffer;
}): VoiceCommandResult {
  return {
    userTranscript: params.userTranscript,
    intent: params.intent,
    actionsLog: params.actionsLog,
    agentMessage: params.agentMessage,
    audio: params.audioBuffer.toString("base64"),
  };
}
