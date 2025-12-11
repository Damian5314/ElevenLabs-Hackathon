/**
 * Text-to-Speech Module for LifeAdmin
 *
 * Converts text to spoken audio using ElevenLabs TTS API.
 *
 * Required ENV variables:
 * - ELEVENLABS_API_KEY: Required for ElevenLabs API calls
 * - ELEVENLABS_VOICE_ID: Optional, defaults to "21m00Tcm4TlvDq8ikWAM" (Rachel - calm, professional)
 */

// ----- Configuration -----
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel voice

// ElevenLabs API endpoint
const ELEVENLABS_TTS_URL = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;

// ----- Type Definitions -----
export interface TTSResponse {
  /** Audio data as Buffer */
  audioBuffer: Buffer;
  /** MIME type of the audio (e.g., "audio/mpeg") */
  mimeType: string;
}

// ----- Error Classes -----
export class TTSError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(`[TTS] ${message}`);
    this.name = "TTSError";
  }
}

// ----- Voice Settings -----
interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: true,
};

// ----- Main Export -----
/**
 * Generates speech audio from text using ElevenLabs TTS.
 *
 * @param text - The text to convert to speech (Dutch or English)
 * @returns Promise<Buffer> - Audio data as Buffer (MP3 format)
 * @throws TTSError - If generation fails or API returns an error
 *
 * @example
 * ```ts
 * const audioBuffer = await generateSpeech("Je afspraak is bevestigd!");
 * // Send audioBuffer as base64 or stream to frontend
 * ```
 */
export async function generateSpeech(text: string): Promise<Buffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new TTSError("ELEVENLABS_API_KEY is not set");
  }

  if (!text || text.trim().length === 0) {
    throw new TTSError("Input text is empty");
  }

  console.log(`[TTS] Generating speech for: "${text.substring(0, 50)}..."`);
  console.log(`[TTS] Using voice ID: ${ELEVENLABS_VOICE_ID}`);

  try {
    const response = await fetch(ELEVENLABS_TTS_URL, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2", // Best for Dutch + English
        voice_settings: DEFAULT_VOICE_SETTINGS,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new TTSError(
        `ElevenLabs API error: ${errorText}`,
        response.status
      );
    }

    // Get audio as ArrayBuffer and convert to Node Buffer
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    console.log(`[TTS] Generated audio: ${audioBuffer.length} bytes`);

    return audioBuffer;
  } catch (error) {
    if (error instanceof TTSError) throw error;

    const message = error instanceof Error ? error.message : "Unknown error";
    throw new TTSError(`Speech generation failed: ${message}`);
  }
}

/**
 * Generates speech and returns with metadata.
 *
 * @param text - The text to convert to speech
 * @returns Promise<TTSResponse> - Audio buffer with MIME type
 */
export async function generateSpeechWithMetadata(
  text: string
): Promise<TTSResponse> {
  const audioBuffer = await generateSpeech(text);
  return {
    audioBuffer,
    mimeType: "audio/mpeg",
  };
}

/**
 * Converts audio buffer to base64 string for JSON transport.
 *
 * @param audioBuffer - Audio data as Buffer
 * @returns Base64 encoded string
 */
export function audioBufferToBase64(audioBuffer: Buffer): string {
  return audioBuffer.toString("base64");
}

// ----- Predefined Response Templates -----
export const RESPONSE_TEMPLATES = {
  appointmentBooked: (service: string, datetime?: string) =>
    datetime
      ? `Je ${service} afspraak is ingepland voor ${datetime}. Je ontvangt een bevestiging per email.`
      : `Je ${service} afspraak is succesvol geboekt. Je ontvangt een bevestiging per email.`,

  formSubmitted: (formType: string) =>
    `Het ${formType} formulier is succesvol ingevuld en verstuurd.`,

  recurringTaskCreated: (label: string, interval: string) =>
    `Ik heb een terugkerende taak aangemaakt: ${label}. Deze wordt automatisch ${intervalToHuman(interval)} uitgevoerd.`,

  error: (action: string) =>
    `Er ging iets mis bij het ${action}. Probeer het opnieuw of geef meer details.`,

  greeting: () =>
    `Hallo! Ik ben LifeAdmin. Hoe kan ik je vandaag helpen?`,

  confirmation: () =>
    `Begrepen! Ik ga dit voor je regelen.`,
};

// ----- Helper Functions -----
/**
 * Converts ISO 8601 duration to human-readable Dutch text.
 */
function intervalToHuman(interval: string): string {
  const mapping: Record<string, string> = {
    P1D: "dagelijks",
    P1W: "wekelijks",
    P2W: "tweewekelijks",
    P1M: "maandelijks",
    P3M: "elk kwartaal",
    P6M: "halfjaarlijks",
    P1Y: "jaarlijks",
  };
  return mapping[interval] || interval;
}
