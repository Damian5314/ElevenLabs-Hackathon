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
  | "conversation"
  | "action_request"
  | "confirm_action"
  | "cancel_action";

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
  /** Whether this is a recurring task */
  recurring?: boolean;
}

export interface Intent {
  /** The type of intent detected */
  type: IntentType;
  /** Details of the task to execute (only for action_request) */
  task?: IntentTask;
  /** Conversational response (for conversation type) */
  response?: string;
  /** Topic being discussed */
  topic?: string;
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
const SYSTEM_PROMPT = `Je bent LifeAdmin, een vriendelijke en behulpzame AI assistent. Je kunt ZOWEL normale gesprekken voeren ALS taken uitvoeren.

BELANGRIJK: Je bent EERST een conversatie partner, en PAS wanneer de gebruiker EXPLICIET vraagt om een actie uit te voeren, stel je dit voor.

LifeAdmin kan helpen met:
- Tandartsafspraken boeken
- Formulieren invullen (events, inschrijvingen)
- Terugkerende taken instellen (bijv. elke 3 maanden een controle)
- Algemene vragen beantwoorden en gesprekken voeren

INTENT TYPES:
1. "conversation" - Voor normale gesprekken, vragen, informatie, of wanneer de gebruiker NIET expliciet een actie vraagt
2. "action_request" - ALLEEN wanneer de gebruiker EXPLICIET vraagt om iets te DOEN (boeken, inschrijven, instellen)
3. "confirm_action" - Wanneer de gebruiker "ja", "doe maar", "bevestig", "akkoord" zegt
4. "cancel_action" - Wanneer de gebruiker "nee", "stop", "annuleer", "niet doen" zegt

KRITIEKE REGELS VOOR INTENT DETECTIE:
- Praten OVER iets ≠ actie uitvoeren. "Vertel me over tandarts afspraken" = conversation
- Vragen stellen = conversation. "Hoe werkt het boeken?" = conversation
- Expliciet verzoek = action_request. "Boek een afspraak", "Maak een afspraak", "Ik wil boeken" = action_request
- Bij TWIJFEL: kies ALTIJD "conversation" en geef een behulpzaam antwoord

BESCHIKBARE ACTIES (alleen voor action_request):
- target_url: "tandarts" - voor tandarts/medische afspraken
- target_url: "event" - voor event inschrijvingen en formulieren

VOORBEELDEN:

Input: "Hoi"
Output:
{
  "type": "conversation",
  "response": "Hoi! Ik ben LifeAdmin, je persoonlijke assistent. Ik kan je helpen met het boeken van afspraken, formulieren invullen, en meer. Waar kan ik je mee helpen?",
  "topic": "greeting"
}

Input: "Wat kun je allemaal?"
Output:
{
  "type": "conversation",
  "response": "Ik kan je helpen met verschillende taken! Bijvoorbeeld tandartsafspraken boeken, je inschrijven voor evenementen, of terugkerende herinneringen instellen. Ik kan ook gewoon kletsen en je vragen beantwoorden. Wat wil je doen?",
  "topic": "capabilities"
}

Input: "Ik moet naar de tandarts"
Output:
{
  "type": "conversation",
  "response": "Ah, je moet naar de tandarts! Wil je dat ik een afspraak voor je boek? Ik kan dat direct regelen als je wilt.",
  "topic": "tandarts"
}

Input: "Vertel me over tandartsafspraken"
Output:
{
  "type": "conversation",
  "response": "Ik kan tandartsafspraken voor je boeken! Het proces is simpel: ik vul automatisch je gegevens in en kies een geschikt tijdstip. Wil je dat ik er een voor je boek?",
  "topic": "tandarts"
}

Input: "Ja, boek maar een afspraak"
Output:
{
  "type": "action_request",
  "task": {
    "kind": "booking",
    "target_url": "tandarts",
    "use_profile": true
  },
  "topic": "tandarts"
}

Input: "Boek een tandartsafspraak voor volgende week"
Output:
{
  "type": "action_request",
  "task": {
    "kind": "booking",
    "target_url": "tandarts",
    "use_profile": true,
    "datetime_preference": "volgende week"
  },
  "topic": "tandarts"
}

Input: "Ik wil me inschrijven voor het event"
Output:
{
  "type": "action_request",
  "task": {
    "kind": "form_fill",
    "target_url": "event",
    "use_profile": true
  },
  "topic": "event"
}

Input: "Zorg dat ik elke 6 maanden een tandartscontrole heb"
Output:
{
  "type": "action_request",
  "task": {
    "kind": "booking",
    "target_url": "tandarts",
    "interval": "P6M",
    "use_profile": true,
    "label": "Halfjaarlijkse tandartscontrole",
    "recurring": true
  },
  "topic": "tandarts"
}

Input: "Ja doe maar" of "Ja" of "Oké" of "Bevestig"
Output:
{
  "type": "confirm_action",
  "response": "Ik ga de actie uitvoeren..."
}

Input: "Nee" of "Stop" of "Annuleer" of "Niet doen"
Output:
{
  "type": "cancel_action",
  "response": "Geen probleem, ik heb de actie geannuleerd. Kan ik je ergens anders mee helpen?"
}

Input: "Hoe laat is het?"
Output:
{
  "type": "conversation",
  "response": "Ik heb helaas geen toegang tot de huidige tijd, maar je kunt die vast zien op je telefoon of computer! Kan ik je ergens anders mee helpen?",
  "topic": "general"
}

INTERVAL FORMAAT (voor recurring tasks):
- "P1W" = elke week
- "P1M" = elke maand
- "P3M" = elke 3 maanden
- "P6M" = elke 6 maanden
- "P1Y" = elk jaar

GEEF ALLEEN GELDIGE JSON TERUG.`;

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
    if (!parsed.type) {
      throw new IntentParseError(
        "Missing required field: type",
        rawResponse
      );
    }

    // Build intent based on type
    const intent: Intent = {
      type: parsed.type as IntentType,
      response: parsed.response,
      topic: parsed.topic,
    };

    // Only add task for action_request type
    if (parsed.type === "action_request" && parsed.task) {
      if (!parsed.task.kind || !parsed.task.target_url) {
        throw new IntentParseError(
          "Missing required task fields (kind or target_url) for action_request",
          rawResponse
        );
      }
      intent.task = {
        kind: parsed.task.kind,
        target_url: parsed.task.target_url,
        interval: parsed.task.interval,
        use_profile: parsed.task.use_profile ?? true,
        label: parsed.task.label,
        datetime_preference: parsed.task.datetime_preference,
        recurring: parsed.task.recurring ?? false,
      };
    }

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
  const { type, task, topic } = intent;

  switch (type) {
    case "conversation":
      return `Gesprek over: ${topic || "algemeen"}`;
    case "action_request":
      if (!task) return "Actie verzoek";
      if (task.recurring) {
        return `Terugkerende taak: ${task.label || task.target_url} (${task.interval})`;
      }
      return `${task.kind === "booking" ? "Afspraak boeken" : "Formulier invullen"} bij ${task.target_url}${task.datetime_preference ? ` (${task.datetime_preference})` : ""}`;
    case "confirm_action":
      return "Bevestiging van actie";
    case "cancel_action":
      return "Annulering van actie";
    default:
      return `Intent: ${type}`;
  }
}
