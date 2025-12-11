/**
 * Speech-to-Text Module for LifeAdmin
 *
 * Converts audio input to text using either Whisper API or ElevenLabs STT.
 *
 * Required ENV variables:
 * - STT_PROVIDER: "whisper" | "elevenlabs" (default: "whisper")
 * - OPENAI_API_KEY: Required if STT_PROVIDER is "whisper"
 * - ELEVENLABS_API_KEY: Required if STT_PROVIDER is "elevenlabs"
 */

import OpenAI from "openai";

// ----- Configuration -----
const STT_PROVIDER = process.env.STT_PROVIDER || "whisper";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// ----- Error Classes -----
export class STTError extends Error {
  constructor(message: string, public readonly provider: string) {
    super(`[STT/${provider}] ${message}`);
    this.name = "STTError";
  }
}

// ----- Whisper Implementation -----
async function transcribeWithWhisper(audioBuffer: Buffer): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new STTError("OPENAI_API_KEY is not set", "whisper");
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  // Convert Buffer to File object for OpenAI API
  const audioFile = new File([audioBuffer], "audio.webm", {
    type: "audio/webm",
  });

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "nl", // Dutch primary, but Whisper auto-detects
      response_format: "text",
    });

    return transcription.trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new STTError(`Transcription failed: ${message}`, "whisper");
  }
}

// ----- ElevenLabs Implementation -----
async function transcribeWithElevenLabs(audioBuffer: Buffer): Promise<string> {
  if (!ELEVENLABS_API_KEY) {
    throw new STTError("ELEVENLABS_API_KEY is not set", "elevenlabs");
  }

  const formData = new FormData();
  const audioBlob = new Blob([audioBuffer], { type: "audio/webm" });
  formData.append("audio", audioBlob, "audio.webm");

  try {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/speech-to-text",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new STTError(
        `API returned ${response.status}: ${errorText}`,
        "elevenlabs"
      );
    }

    const data = await response.json();
    return data.text?.trim() || "";
  } catch (error) {
    if (error instanceof STTError) throw error;
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new STTError(`Transcription failed: ${message}`, "elevenlabs");
  }
}

// ----- Main Export -----
/**
 * Transcribes audio to text using the configured STT provider.
 *
 * @param audioBuffer - Raw audio data as Buffer (supports webm, mp3, wav, etc.)
 * @returns Promise<string> - The transcribed text
 * @throws STTError - If transcription fails or provider is misconfigured
 *
 * @example
 * ```ts
 * const transcript = await transcribeAudio(audioBuffer);
 * console.log(transcript); // "Maak een tandartsafspraak voor volgende week"
 * ```
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  console.log(`[STT] Transcribing audio with provider: ${STT_PROVIDER}`);
  console.log(`[STT] Audio buffer size: ${audioBuffer.length} bytes`);

  if (audioBuffer.length === 0) {
    throw new STTError("Audio buffer is empty", STT_PROVIDER);
  }

  switch (STT_PROVIDER) {
    case "whisper":
      return transcribeWithWhisper(audioBuffer);
    case "elevenlabs":
      return transcribeWithElevenLabs(audioBuffer);
    default:
      throw new STTError(
        `Unknown STT_PROVIDER: ${STT_PROVIDER}. Use "whisper" or "elevenlabs"`,
        STT_PROVIDER
      );
  }
}
