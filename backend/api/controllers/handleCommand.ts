/**
 * Handle Command Controller
 *
 * Main orchestrator for voice commands with conversation support:
 * 1. STT: Audio -> Text
 * 2. Intent: Text -> Intent JSON (conversation or action)
 * 3. Handle: Respond conversationally OR request confirmation for actions
 * 4. Execute: Only run tasks after confirmation
 * 5. TTS: Generate audio response
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
import { CommandResponse, PendingAction, ExecutionResult } from "../types";
import { IntentTask } from "../../voice";

// In-memory store for pending actions (in production, use Redis/DB)
const pendingActions: Map<string, PendingAction> = new Map();

// Clean up expired pending actions every minute
setInterval(() => {
  const now = new Date().toISOString();
  for (const [id, action] of pendingActions.entries()) {
    if (action.expiresAt < now) {
      pendingActions.delete(id);
      console.log(`[PendingActions] Expired: ${id}`);
    }
  }
}, 60000);

/**
 * Generate a unique ID for pending actions
 */
function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a pending action that waits for confirmation
 */
function createPendingAction(task: IntentTask): PendingAction {
  const id = generateActionId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes expiry

  const pendingAction: PendingAction = {
    id,
    task,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  pendingActions.set(id, pendingAction);
  console.log(`[PendingActions] Created: ${id}`, task);

  return pendingAction;
}

/**
 * Get and remove a pending action
 */
function consumePendingAction(): PendingAction | null {
  // Get the most recent pending action
  const entries = Array.from(pendingActions.entries());
  if (entries.length === 0) return null;

  const [id, action] = entries[entries.length - 1];
  pendingActions.delete(id);
  console.log(`[PendingActions] Consumed: ${id}`);

  return action;
}

/**
 * Clear all pending actions
 */
function clearPendingActions(): void {
  pendingActions.clear();
  console.log(`[PendingActions] Cleared all`);
}

/**
 * Process a voice command from audio input
 */
export async function handleAudioCommand(
  audioBuffer: Buffer
): Promise<CommandResponse> {
  const actionsLog: string[] = [];

  try {
    // Step 1: Speech-to-Text
    actionsLog.push("[STT] Transcriberen van audio...");
    const userTranscript = await transcribeAudio(audioBuffer);
    actionsLog.push(`[STT] Voltooid: "${userTranscript}"`);

    // Step 2: Extract Intent
    actionsLog.push("[Intent] Analyseren van opdracht...");
    const intent = await extractIntent(userTranscript);
    actionsLog.push(`[Intent] Type: ${intent.type}`);

    // Step 3: Handle based on intent type
    const result = await handleIntent(intent, actionsLog);

    // Step 4: Generate TTS audio
    actionsLog.push("[TTS] Genereren van spraak...");
    const audioResponseBuffer = await generateSpeech(result.agentMessage);
    const audioBase64 = audioBufferToBase64(audioResponseBuffer);
    actionsLog.push("[TTS] Voltooid");

    return {
      userTranscript,
      intent,
      agentMessage: result.agentMessage,
      actionsLog,
      audio: audioBase64,
      pendingAction: result.pendingAction,
      actionExecuted: result.actionExecuted,
      executionResult: result.executionResult,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    actionsLog.push(`[ERROR] ${errorMessage}`);

    // Generate error response with TTS
    const errorAgentMessage = `Er ging iets mis bij het verwerken van je bericht. Kun je dat nog een keer proberen?`;

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
        type: "conversation",
        response: errorAgentMessage,
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
    actionsLog.push(`[Input] Direct tekst: "${text}"`);

    // Skip STT, go straight to intent extraction
    actionsLog.push("[Intent] Analyseren van opdracht...");
    const intent = await extractIntent(text);
    actionsLog.push(`[Intent] Type: ${intent.type}`);

    // Handle based on intent type
    const result = await handleIntent(intent, actionsLog);

    // Generate TTS audio
    actionsLog.push("[TTS] Genereren van spraak...");
    const audioResponseBuffer = await generateSpeech(result.agentMessage);
    const audioBase64 = audioBufferToBase64(audioResponseBuffer);
    actionsLog.push("[TTS] Voltooid");

    return {
      userTranscript: text,
      intent,
      agentMessage: result.agentMessage,
      actionsLog,
      audio: audioBase64,
      pendingAction: result.pendingAction,
      actionExecuted: result.actionExecuted,
      executionResult: result.executionResult,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    actionsLog.push(`[ERROR] ${errorMessage}`);

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
        type: "conversation",
        response: errorAgentMessage,
      },
      agentMessage: errorAgentMessage,
      actionsLog,
      audio: audioBase64,
    };
  }
}

/**
 * Handle intent - main logic for conversation vs action flow
 */
interface HandleIntentResult {
  agentMessage: string;
  pendingAction?: PendingAction;
  actionExecuted?: boolean;
  executionResult?: ExecutionResult;
}

async function handleIntent(
  intent: Awaited<ReturnType<typeof extractIntent>>,
  actionsLog: string[]
): Promise<HandleIntentResult> {
  const { type } = intent;

  switch (type) {
    case "conversation":
      // Just respond with the conversational message
      actionsLog.push("[Chat] Conversatie response");
      return {
        agentMessage: intent.response || "Ik begrijp je niet helemaal. Kun je dat anders formuleren?",
      };

    case "action_request":
      // User wants to do something - ask for confirmation
      if (!intent.task) {
        return {
          agentMessage: "Ik begrijp wat je wilt doen, maar ik mis wat details. Kun je specifieker zijn?",
        };
      }

      actionsLog.push(`[Action] Actie gevraagd: ${intent.task.kind} -> ${intent.task.target_url}`);

      // Create pending action and ask for confirmation
      const pendingAction = createPendingAction(intent.task);
      const confirmMessage = buildConfirmationMessage(intent.task);

      actionsLog.push("[Action] Wacht op bevestiging...");

      return {
        agentMessage: confirmMessage,
        pendingAction,
      };

    case "confirm_action":
      // User confirmed - execute the pending action
      const actionToExecute = consumePendingAction();

      if (!actionToExecute) {
        actionsLog.push("[Action] Geen actie om te bevestigen");
        return {
          agentMessage: "Er is geen actie om te bevestigen. Wat wil je dat ik doe?",
        };
      }

      actionsLog.push(`[Action] Bevestigd! Uitvoeren: ${actionToExecute.task.kind}`);
      const executionResult = await executeTask(actionToExecute.task, actionsLog);
      const resultMessage = buildMessage("", { type: "action_request", task: actionToExecute.task }, executionResult);

      return {
        agentMessage: resultMessage,
        actionExecuted: true,
        executionResult,
      };

    case "cancel_action":
      // User cancelled - clear pending action
      clearPendingActions();
      actionsLog.push("[Action] Geannuleerd door gebruiker");

      return {
        agentMessage: intent.response || "Geen probleem, ik heb de actie geannuleerd. Kan ik je ergens anders mee helpen?",
      };

    default:
      return {
        agentMessage: "Ik begrijp je niet helemaal. Kun je dat anders formuleren?",
      };
  }
}

/**
 * Build a confirmation message for an action
 */
function buildConfirmationMessage(task: IntentTask): string {
  const targetName = task.target_url === "tandarts" ? "tandarts" : "evenement";

  if (task.recurring) {
    const intervalText = intervalToHuman(task.interval || "P3M");
    return `Ik ga een terugkerende taak instellen om ${intervalText} een ${targetName} afspraak te boeken. Wil je dat ik dit doe? Zeg "ja" om te bevestigen of "nee" om te annuleren.`;
  }

  if (task.kind === "booking") {
    const timeText = task.datetime_preference
      ? ` voor ${task.datetime_preference}`
      : "";
    return `Ik ga een ${targetName} afspraak${timeText} voor je boeken met je opgeslagen gegevens. Wil je dat ik dit doe? Zeg "ja" om te bevestigen of "nee" om te annuleren.`;
  }

  if (task.kind === "form_fill") {
    return `Ik ga het ${targetName} formulier voor je invullen met je opgeslagen gegevens. Wil je dat ik dit doe? Zeg "ja" om te bevestigen of "nee" om te annuleren.`;
  }

  return `Ik ga deze actie uitvoeren. Zeg "ja" om te bevestigen of "nee" om te annuleren.`;
}

/**
 * Execute the task - booking, form fill, or create workflow
 */
async function executeTask(
  task: IntentTask,
  actionsLog: string[]
): Promise<ExecutionResult> {
  // Check if it's a recurring task
  if (task.recurring && task.interval) {
    // Create workflow in database
    actionsLog.push(`[Workflow] Aanmaken: ${task.label || task.target_url}`);

    const workflow = createWorkflow({
      type: task.kind,
      target_url: task.target_url,
      interval: task.interval,
      label: task.label,
      use_profile: task.use_profile,
    });

    actionsLog.push(`[Workflow] Opgeslagen met ID: ${workflow.id}`);

    // Execute first run
    actionsLog.push("[Playwright] Eerste uitvoering starten...");
    const firstRunResult = await runTask(task);

    if (firstRunResult.success) {
      actionsLog.push("[Playwright] Eerste uitvoering voltooid");
    } else {
      actionsLog.push("[Playwright] Eerste uitvoering mislukt, workflow is wel aangemaakt");
    }

    return {
      success: true,
      message: "Workflow created and first run completed",
      confirmationText: firstRunResult.confirmationText,
    };
  }

  // Regular one-time task
  actionsLog.push(`[Playwright] Uitvoeren van ${task.kind}...`);
  const result = await runTask(task);

  if (result.success) {
    actionsLog.push(`[Playwright] Voltooid: ${result.confirmationText}`);
  } else {
    actionsLog.push(`[Playwright] Mislukt: ${result.error}`);
  }

  return {
    success: result.success,
    message: result.success ? "Task completed" : result.error || "Failed",
    confirmationText: result.confirmationText,
    error: result.error,
  };
}

/**
 * Convert ISO 8601 duration to human-readable Dutch text
 */
function intervalToHuman(interval: string): string {
  const mapping: { [key: string]: string } = {
    P1D: "dagelijks",
    P1W: "wekelijks",
    P2W: "tweewekelijks",
    P1M: "maandelijks",
    P3M: "elk kwartaal",
    P6M: "halfjaarlijks",
    P1Y: "jaarlijks",
  };

  return mapping[interval.toUpperCase()] || interval;
}
