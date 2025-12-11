/**
 * Agent Reply Service - Generates human-readable responses for action results
 */

import { Intent, ExecutionResult } from "../types";

/**
 * Build a response message based on the intent and execution result
 */
export function buildMessage(
  transcript: string,
  intent: Intent,
  executionResult: ExecutionResult
): string {
  const { type, task } = intent;

  // Error case
  if (!executionResult.success) {
    const providerType = task?.provider_type || "onbekend";
    return buildErrorMessage(providerType, executionResult.error);
  }

  // Success cases based on task type
  if (task) {
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

  const serviceName = getServiceName(task.provider_type);

  if (result.confirmationText) {
    return `Je ${serviceName} afspraak is succesvol geboekt. ${result.confirmationText}`;
  }

  return `Je ${serviceName} afspraak is ingepland. Je ontvangt een bevestiging per email.`;
}

/**
 * Build message for form submission
 */
function buildFormMessage(
  task: Intent["task"],
  result: ExecutionResult
): string {
  if (!task) return "Het formulier is ingevuld.";

  const formName = getFormName(task.provider_type);

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

  const label = task.label || getServiceName(task.provider_type);
  const intervalText = intervalToHuman(task.interval || "P3M");

  let message = `Ik heb een terugkerende taak aangemaakt: ${label}. Deze wordt automatisch ${intervalText} uitgevoerd.`;

  if (result.confirmationText) {
    message += ` De eerste actie is al uitgevoerd: ${result.confirmationText}`;
  }

  return message;
}

/**
 * Build an error message
 */
function buildErrorMessage(providerType: string, error?: string): string {
  const service = getServiceName(providerType);

  if (error) {
    return `Er ging iets mis bij het uitvoeren van je ${service} opdracht. Fout: ${error}. Probeer het opnieuw.`;
  }

  return `Er ging iets mis bij het uitvoeren van je opdracht. Probeer het opnieuw.`;
}

// ----- Helper Functions -----

function getServiceName(providerType: string): string {
  const mapping: { [key: string]: string } = {
    tandarts: "tandarts",
    dentist: "tandarts",
    huisarts: "huisarts",
    event: "evenement",
    form: "formulier",
  };

  const key = providerType?.toLowerCase() || "";
  return mapping[key] || providerType || "dienst";
}

function getFormName(providerType: string): string {
  const mapping: { [key: string]: string } = {
    tandarts: "afspraakformulier",
    event: "inschrijfformulier",
    form: "formulier",
  };

  const key = providerType?.toLowerCase() || "";
  return mapping[key] || "formulier";
}

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
