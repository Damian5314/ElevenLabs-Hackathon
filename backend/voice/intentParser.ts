/**
 * Intent Parser Module for LifeAdmin
 *
 * Extracts structured intent from user text using OpenAI GPT.
 *
 * Required ENV variables:
 * - OPENAI_API_KEY: Required for GPT API calls
 */

import OpenAI from "openai";

// ----- Configuration -----
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ----- Type Definitions -----
export type IntentType =
  | "book_appointment"
  | "fill_form_once"
  | "create_recurring_task";

export interface IntentTask {
  /** The kind of task to execute */
  kind: "booking" | "form_fill";
  /** Target URL/page for the automation (e.g., "tandarts" or "event") */
  target_url: string;
  /** ISO-like interval string for recurring tasks (e.g., "P3M" = every 3 months) */
  interval?: string;
  /** Whether to use profile data (name, email, phone) */
  use_profile?: boolean;
  /** Human-readable label for the task */
  label?: string;
  /** Date/time preference (e.g., "next_morning", "2024-01-15", "volgende week") */
  datetime_preference?: string;
}

export interface Intent {
  /** The type of intent detected */
  type: IntentType;
  /** Details of the task to execute */
  task: IntentTask;
}

// ----- Error Classes -----
export class IntentParseError extends Error {
  constructor(
    message: string,
    public readonly rawResponse?: string
  ) {
    super(`[IntentParser] ${message}`);
    this.name = "IntentParseError";
  }
}

// ----- System Prompt -----
const SYSTEM_PROMPT = `Je bent LifeAdmin, een slimme assistent die voice commands omzet naar gestructureerde JSON.

LifeAdmin helpt gebruikers met:
- Tandartsafspraken boeken
- Formulieren invullen (events, inschrijvingen)
- Terugkerende taken instellen (bijv. elke 3 maanden een controle)

REGELS:
1. Geef ALLEEN geldige JSON terug, geen extra tekst of uitleg.
2. Gebruik de exacte structuur zoals hieronder.
3. Bij twijfel, kies de meest logische optie.

BESCHIKBARE TARGET_URLS:
- "tandarts" - voor tandarts/medische afspraken
- "event" - voor event inschrijvingen en formulieren

INTENT TYPES:
- "book_appointment" - Eenmalige afspraak boeken
- "fill_form_once" - Eenmalig formulier invullen
- "create_recurring_task" - Terugkerende taak instellen

INTERVAL FORMAAT (ISO 8601 Duration):
- "P1D" = elke dag
- "P1W" = elke week
- "P1M" = elke maand
- "P3M" = elke 3 maanden
- "P6M" = elke 6 maanden
- "P1Y" = elk jaar

VOORBEELDEN:

Input: "Maak een tandartsafspraak voor volgende week"
Output:
{
  "type": "book_appointment",
  "task": {
    "kind": "booking",
    "target_url": "tandarts",
    "use_profile": true,
    "datetime_preference": "volgende week"
  }
}

Input: "Ik wil me inschrijven voor het event"
Output:
{
  "type": "fill_form_once",
  "task": {
    "kind": "form_fill",
    "target_url": "event",
    "use_profile": true
  }
}

Input: "Zorg dat ik elke 6 maanden een tandartscontrole heb"
Output:
{
  "type": "create_recurring_task",
  "task": {
    "kind": "booking",
    "target_url": "tandarts",
    "interval": "P6M",
    "use_profile": true,
    "label": "Halfjaarlijkse tandartscontrole"
  }
}

Input: "Book a dentist appointment for tomorrow morning"
Output:
{
  "type": "book_appointment",
  "task": {
    "kind": "booking",
    "target_url": "tandarts",
    "use_profile": true,
    "datetime_preference": "tomorrow morning"
  }
}

Input: "Herinner me elke 3 maanden aan een tandartsafspraak"
Output:
{
  "type": "create_recurring_task",
  "task": {
    "kind": "booking",
    "target_url": "tandarts",
    "interval": "P3M",
    "use_profile": true,
    "label": "Driemaandelijkse tandartsherinnering"
  }
}`;

// ----- Main Export -----
/**
 * Extracts structured intent from user text using GPT.
 *
 * @param text - The transcribed user command (Dutch or English)
 * @returns Promise<Intent> - Structured intent object
 * @throws IntentParseError - If parsing fails or API returns invalid JSON
 *
 * @example
 * ```ts
 * const intent = await extractIntent("Maak een tandartsafspraak");
 * console.log(intent.type); // "book_appointment"
 * console.log(intent.task.target_url); // "tandarts"
 * ```
 */
export async function extractIntent(text: string): Promise<Intent> {
  if (!OPENAI_API_KEY) {
    throw new IntentParseError("OPENAI_API_KEY is not set");
  }

  if (!text || text.trim().length === 0) {
    throw new IntentParseError("Input text is empty");
  }

  console.log(`[IntentParser] Parsing: "${text}"`);

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Fast and cost-effective for hackathon
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0.1, // Low temperature for consistent JSON output
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const rawResponse = completion.choices[0]?.message?.content;

    if (!rawResponse) {
      throw new IntentParseError("GPT returned empty response");
    }

    console.log(`[IntentParser] Raw GPT response: ${rawResponse}`);

    // Parse and validate JSON
    const parsed = JSON.parse(rawResponse);

    // Validate required fields
    if (!parsed.type || !parsed.task) {
      throw new IntentParseError(
        "Missing required fields (type or task)",
        rawResponse
      );
    }

    if (!parsed.task.kind || !parsed.task.target_url) {
      throw new IntentParseError(
        "Missing required task fields (kind or target_url)",
        rawResponse
      );
    }

    // Cast to Intent type
    const intent: Intent = {
      type: parsed.type as IntentType,
      task: {
        kind: parsed.task.kind,
        target_url: parsed.task.target_url,
        interval: parsed.task.interval,
        use_profile: parsed.task.use_profile ?? true,
        label: parsed.task.label,
        datetime_preference: parsed.task.datetime_preference,
      },
    };

    console.log(`[IntentParser] Extracted intent:`, intent);
    return intent;
  } catch (error) {
    if (error instanceof IntentParseError) throw error;

    if (error instanceof SyntaxError) {
      throw new IntentParseError(`Invalid JSON from GPT: ${error.message}`);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    throw new IntentParseError(`GPT API call failed: ${message}`);
  }
}

// ----- Helper Functions -----
/**
 * Generates a human-readable description of the intent for logging/UI.
 */
export function describeIntent(intent: Intent): string {
  const { type, task } = intent;

  switch (type) {
    case "book_appointment":
      return `Afspraak boeken bij ${task.target_url}${task.datetime_preference ? ` (${task.datetime_preference})` : ""}`;
    case "fill_form_once":
      return `Formulier invullen voor ${task.target_url}`;
    case "create_recurring_task":
      return `Terugkerende taak: ${task.label || task.target_url} (interval: ${task.interval})`;
    default:
      return `Taak: ${type}`;
  }
}
