/**
 * Handle Command Controller
 *
 * Main orchestrator for voice commands:
 * 1. STT: Audio � Text
 * 2. Intent: Text � Intent JSON
 * 3. Execute: Run Playwright task or create workflow
 * 4. TTS: Generate audio response
 */

import {
  transcribeAudio,
  extractIntent,
  generateSpeech,
  audioBufferToBase64,
} from "../../voice";
import { runTask } from "../services/executor";
import { buildMessage } from "../services/agentReply";
import { createWorkflow } from "../services/database";
import { CommandResponse, Intent } from "../types";

/**
 * Process a voice command from audio input
 */
export async function handleAudioCommand(
  audioBuffer: Buffer
): Promise<CommandResponse> {
  const actionsLog: string[] = [];

  try {
    // Step 1: Speech-to-Text
    actionsLog.push("<� STT: Transcriberen van audio...");
    const userTranscript = await transcribeAudio(audioBuffer);
    actionsLog.push(` STT voltooid: "${userTranscript}"`);

    // Step 2: Extract Intent
    actionsLog.push(">� Intent: Analyseren van opdracht...");
    const intent = await extractIntent(userTranscript);
    actionsLog.push(` Intent: ${intent.type} � ${intent.task.target_url}`);

    // Step 3: Execute based on intent type
    const executionResult = await executeIntent(intent, actionsLog);

    // Step 4: Build agent response message
    const agentMessage = buildMessage(userTranscript, intent, executionResult);
    actionsLog.push(`=� Agent: "${agentMessage.substring(0, 50)}..."`);

    // Step 5: Generate TTS audio
    actionsLog.push("=
 TTS: Genereren van spraak...");
    const audioResponseBuffer = await generateSpeech(agentMessage);
    const audioBase64 = audioBufferToBase64(audioResponseBuffer);
    actionsLog.push(" TTS voltooid");

    return {
      userTranscript,
      intent,
      agentMessage,
      actionsLog,
      audio: audioBase64,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    actionsLog.push(`L Fout: ${errorMessage}`);

    // Generate error response with TTS
    const errorAgentMessage = `Er ging iets mis bij het verwerken van je opdracht. ${errorMessage}`;

    let audioBase64 = "";
    try {
      const errorAudio = await generateSpeech(errorAgentMessage);
      audioBase64 = audioBufferToBase64(errorAudio);
    } catch {
      // If TTS fails too, continue without audio
    }

    return {
      userTranscript: "",
      intent: {
        type: "book_appointment",
        task: { kind: "booking", target_url: "unknown" },
      },
      agentMessage: errorAgentMessage,
      actionsLog,
      audio: audioBase64,
    };
  }
}

/**
 * Process a text command directly (for testing without audio)
 */
export async function handleTextCommand(
  text: string
): Promise<CommandResponse> {
  const actionsLog: string[] = [];

  try {
    actionsLog.push(`=� Direct tekst input: "${text}"`);

    // Skip STT, go straight to intent extraction
    actionsLog.push(">� Intent: Analyseren van opdracht...");
    const intent = await extractIntent(text);
    actionsLog.push(` Intent: ${intent.type} � ${intent.task.target_url}`);

    // Execute based on intent type
    const executionResult = await executeIntent(intent, actionsLog);

    // Build agent response message
    const agentMessage = buildMessage(text, intent, executionResult);
    actionsLog.push(`=� Agent: "${agentMessage.substring(0, 50)}..."`);

    // Generate TTS audio
    actionsLog.push("=
 TTS: Genereren van spraak...");
    const audioResponseBuffer = await generateSpeech(agentMessage);
    const audioBase64 = audioBufferToBase64(audioResponseBuffer);
    actionsLog.push(" TTS voltooid");

    return {
      userTranscript: text,
      intent,
      agentMessage,
      actionsLog,
      audio: audioBase64,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    actionsLog.push(`L Fout: ${errorMessage}`);

    const errorAgentMessage = `Er ging iets mis: ${errorMessage}`;

    let audioBase64 = "";
    try {
      const errorAudio = await generateSpeech(errorAgentMessage);
      audioBase64 = audioBufferToBase64(errorAudio);
    } catch {
      // Continue without audio
    }

    return {
      userTranscript: text,
      intent: {
        type: "book_appointment",
        task: { kind: "booking", target_url: "unknown" },
      },
      agentMessage: errorAgentMessage,
      actionsLog,
      audio: audioBase64,
    };
  }
}

/**
 * Execute the intent - either run task directly or create workflow
 */
async function executeIntent(
  intent: Intent,
  actionsLog: string[]
): Promise<{ success: boolean; confirmationText?: string; error?: string }> {
  const { type, task } = intent;

  switch (type) {
    case "book_appointment":
    case "fill_form_once":
      // Execute immediately via Playwright
      actionsLog.push(`> Playwright: Uitvoeren van ${task.kind}...`);
      const result = await runTask(task);

      if (result.success) {
        actionsLog.push(` Taak voltooid: ${result.confirmationText}`);
      } else {
        actionsLog.push(`L Taak mislukt: ${result.error}`);
      }

      return result;

    case "create_recurring_task":
      // Create workflow in database
      actionsLog.push(`=� Workflow aanmaken: ${task.label || task.target_url}`);

      const workflow = createWorkflow({
        type: task.kind,
        target_url: task.target_url,
        interval: task.interval || "P3M",
        label: task.label,
        use_profile: task.use_profile,
      });

      actionsLog.push(` Workflow opgeslagen met ID: ${workflow.id}`);

      // Also execute the task immediately for demo purposes
      actionsLog.push(`> Eerste uitvoering starten...`);
      const firstRunResult = await runTask(task);

      if (firstRunResult.success) {
        actionsLog.push(` Eerste uitvoering voltooid`);
      } else {
        actionsLog.push(`� Eerste uitvoering mislukt, workflow is wel aangemaakt`);
      }

      return {
        success: true,
        confirmationText: firstRunResult.confirmationText,
      };

    default:
      actionsLog.push(`� Onbekend intent type: ${type}`);
      return {
        success: false,
        error: `Unknown intent type: ${type}`,
      };
  }
}
