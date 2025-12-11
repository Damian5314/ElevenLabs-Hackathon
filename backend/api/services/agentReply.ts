/**
 * Agent Reply Service - Generates human-readable responses for the agent
 */

import { Intent, ExecutionResult } from "../types";

/**
 * Build a response message based on the intent and execution result
 * This is used for action execution results, not for conversations
 */
export function buildMessage(
  transcript: string,
  intent: Intent,
  executionResult: ExecutionResult
): string {
  const { type, task } = intent;

  // Error case
  if (!executionResult.success) {
    return buildErrorMessage(type, task?.target_url || "onbekend", executionResult.error);
  }

  // For action_request type, build appropriate success message
  if (type === "action_request" && task) {
    if (task.recurring) {
      return buildRecurringTaskMessage(task, executionResult);
    }
    if (task.kind === "booking") {
      return buildAppointmentMessage(task, executionResult);
    }
    if (task.kind === "form_fill") {
      return buildFormMessage(task, executionResult);
    }
  }

  // Default success message
  return "Ik heb je opdracht uitgevoerd.";
}

/**
 * Build message for appointment booking
 */
function buildAppointmentMessage(
  task: Intent["task"],
  result: ExecutionResult
): string {
  if (!task) return "Je afspraak is geboekt.";

  const serviceName = getServiceName(task.target_url);
  const dateTime = task.datetime_preference || "een beschikbaar moment";

  if (result.confirmationText) {
    return `Je ${serviceName} afspraak is succesvol geboekt. ${result.confirmationText}`;
  }

  return `Je ${serviceName} afspraak is ingepland voor ${dateTime}. Je ontvangt een bevestiging per email.`;
}

/**
 * Build message for form submission
 */
function buildFormMessage(
  task: Intent["task"],
  result: ExecutionResult
): string {
  if (!task) return "Het formulier is ingevuld.";

  const formName = getFormName(task.target_url);

  if (result.confirmationText) {
    return `Het ${formName} is succesvol ingevuld. ${result.confirmationText}`;
  }

  return `Het ${formName} is succesvol ingevuld en verstuurd.`;
}

/**
 * Build message for recurring task creation
 */
function buildRecurringTaskMessage(
  task: Intent["task"],
  result: ExecutionResult
): string {
  if (!task) return "De terugkerende taak is aangemaakt.";

  const label = task.label || getServiceName(task.target_url);
  const intervalText = intervalToHuman(task.interval || "P3M");

  let message = `Ik heb een terugkerende taak aangemaakt: ${label}. Deze wordt automatisch ${intervalText} uitgevoerd.`;

  // If the first run was also executed
  if (result.confirmationText) {
    message += ` De eerste actie is al uitgevoerd: ${result.confirmationText}`;
  }

  return message;
}

/**
 * Build an error message
 */
function buildErrorMessage(
  intentType: string,
  targetUrl: string,
  error?: string
): string {
  const action = getActionName(intentType, targetUrl);

  if (error) {
    return `Er ging iets mis bij het ${action}. Fout: ${error}. Probeer het opnieuw.`;
  }

  return `Er ging iets mis bij het ${action}. Probeer het opnieuw of geef meer details.`;
}

// ----- Helper Functions -----

/**
 * Get human-readable service name from target_url
 */
function getServiceName(targetUrl: string): string {
  const mapping: { [key: string]: string } = {
    tandarts: "tandarts",
    dentist: "tandarts",
    event: "evenement",
    form: "formulier",
  };

  const key = targetUrl.toLowerCase();
  return mapping[key] || targetUrl;
}

/**
 * Get human-readable form name from target_url
 */
function getFormName(targetUrl: string): string {
  const mapping: { [key: string]: string } = {
    tandarts: "afspraakformulier",
    event: "inschrijfformulier",
    form: "formulier",
  };

  const key = targetUrl.toLowerCase();
  return mapping[key] || "formulier";
}

/**
 * Get action description for error messages
 */
function getActionName(intentType: string, targetUrl: string): string {
  const service = getServiceName(targetUrl);

  switch (intentType) {
    case "action_request":
      return `uitvoeren van je ${service} opdracht`;
    default:
      return `uitvoeren van je opdracht`;
  }
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
    PT1M: "elke minuut",
    PT5M: "elke 5 minuten",
    PT1H: "elk uur",
  };

  return mapping[interval.toUpperCase()] || interval;
}
