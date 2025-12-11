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
  | "search_providers"
  | "select_provider"
  | "select_datetime"
  | "confirm_action"
  | "cancel_action";

export interface IntentTask {
  /** The kind of task to execute */
  kind: "booking" | "form_fill";
  /** Provider category (e.g., "tandarts", "huisarts") */
  provider_type: string;
  /** Specific provider ID if selected */
  provider_id?: string;
  /** Search query for finding providers */
  search_query?: string;
  /** ISO-like interval string for recurring tasks (e.g., "P3M" = every 3 months) */
  interval?: string;
  /** Whether to use profile data (name, email, phone) */
  use_profile?: boolean;
  /** Human-readable label for the task */
  label?: string;
  /** Date/time preference (e.g., "next_morning", "2024-01-15", "volgende week") */
  datetime_preference?: string;
  /** Specific time slot selected */
  time_slot?: string;
  /** Whether this is a recurring task */
  recurring?: boolean;
}

export interface Intent {
  /** The type of intent detected */
  type: IntentType;
  /** Details of the task to execute */
  task?: IntentTask;
  /** Conversational response (for conversation type) */
  response?: string;
  /** Topic being discussed */
  topic?: string;
  /** Selection number (1, 2, 3, etc.) or "beste" for auto-select */
  selection?: string | number;
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
const SYSTEM_PROMPT = `Je bent LifeAdmin, een vriendelijke en behulpzame AI assistent. Je helpt gebruikers met het zoeken en boeken van afspraken.

BELANGRIJK: Je bent EERST een conversatie partner. Je helpt de gebruiker door de juiste flow:
1. Eerst zoeken naar providers (tandarts, huisarts, etc.)
2. Dan een provider kiezen
3. Dan datum/tijd kiezen
4. Dan bevestigen

INTENT TYPES:
1. "conversation" - Normale gesprekken, vragen, begroetingen
2. "search_providers" - Wanneer gebruiker vraagt om te zoeken naar een tandarts/huisarts/etc.
3. "select_provider" - Wanneer gebruiker een specifieke provider kiest (nummer of naam)
4. "select_datetime" - Wanneer gebruiker een datum/tijd kiest
5. "confirm_action" - Wanneer gebruiker "ja", "doe maar", "bevestig" zegt
6. "cancel_action" - Wanneer gebruiker "nee", "stop", "annuleer" zegt

ZOEK TRIGGERS (gebruik ALTIJD search_providers, NOOIT conversation):
- "Zoek een tandarts"
- "Ik zoek een tandarts"
- "Vind een tandarts voor me"
- "Welke tandartsen zijn er"
- "Ik wil een tandartsafspraak maken" → search_providers!
- "Boek een tandarts" → search_providers!
- "Ik moet naar de tandarts" → search_providers!
- "Kun je een tandarts zoeken" → search_providers!
- "Kun je een tandartsafspraak maken" → search_providers!
- "Maak een afspraak bij de tandarts" → search_providers!
- "Regel een tandarts voor me" → search_providers!
- "tandarts in Amsterdam" → search_providers!
- ELKE vraag over tandarts/huisarts/dokter afspraak maken → search_providers!

BELANGRIJK: Als iemand vraagt om een afspraak te MAKEN/BOEKEN/REGELEN,
return ALTIJD type "search_providers" - NIET "conversation"!
De response mag NIET "ik ga zoeken" zeggen - dat gebeurt automatisch.

SELECTIE TRIGGERS (gebruik select_provider):
- "Nummer 1" / "De eerste" / "1"
- "Nummer 2" / "De tweede" / "2"
- "De beste" / "Kies de beste" / "Kies jij maar"
- Naam van provider: "Tandartspraktijk De Witte Tand"

DATUM/TIJD TRIGGERS (gebruik select_datetime):
- "Morgen om 10 uur"
- "Volgende week maandag"
- "De eerste slot"
- "9:30"

VOORBEELDEN:

Input: "Hoi"
Output:
{
  "type": "conversation",
  "response": "Hoi! Ik ben LifeAdmin, je persoonlijke assistent. Ik kan je helpen met het zoeken en boeken van afspraken bij bijvoorbeeld de tandarts. Waar kan ik je mee helpen?",
  "topic": "greeting"
}

Input: "Ik zoek een tandarts"
Output:
{
  "type": "search_providers",
  "task": {
    "kind": "booking",
    "provider_type": "tandarts"
  },
  "topic": "tandarts"
}

Input: "Zoek een tandarts in de buurt"
Output:
{
  "type": "search_providers",
  "task": {
    "kind": "booking",
    "provider_type": "tandarts",
    "search_query": "in de buurt"
  },
  "topic": "tandarts"
}

Input: "Ik wil een tandartsafspraak maken"
Output:
{
  "type": "search_providers",
  "task": {
    "kind": "booking",
    "provider_type": "tandarts"
  },
  "topic": "tandarts"
}

Input: "Boek een tandarts voor me"
Output:
{
  "type": "search_providers",
  "task": {
    "kind": "booking",
    "provider_type": "tandarts"
  },
  "topic": "tandarts"
}

Input: "Kun je voor mij een tandartsafspraak maken in Amsterdam?"
Output:
{
  "type": "search_providers",
  "task": {
    "kind": "booking",
    "provider_type": "tandarts",
    "search_query": "Amsterdam"
  },
  "topic": "tandarts"
}

Input: "Regel een tandarts voor me" of "Maak een tandarts afspraak"
Output:
{
  "type": "search_providers",
  "task": {
    "kind": "booking",
    "provider_type": "tandarts"
  },
  "topic": "tandarts"
}

Input: "Nummer 2" of "De tweede"
Output:
{
  "type": "select_provider",
  "selection": 2
}

Input: "Kies de beste" of "Kies jij maar"
Output:
{
  "type": "select_provider",
  "selection": "beste"
}

Input: "Dental Care Plus"
Output:
{
  "type": "select_provider",
  "selection": "Dental Care Plus"
}

Input: "Morgen om 10 uur"
Output:
{
  "type": "select_datetime",
  "task": {
    "kind": "booking",
    "provider_type": "tandarts",
    "datetime_preference": "morgen",
    "time_slot": "10:00"
  }
}

Input: "De eerste beschikbare"
Output:
{
  "type": "select_datetime",
  "selection": "eerste"
}

Input: "Ja" of "Ja, doe maar" of "Bevestig"
Output:
{
  "type": "confirm_action",
  "response": "Ik ga de afspraak voor je boeken..."
}

Input: "Nee" of "Annuleer" of "Stop"
Output:
{
  "type": "cancel_action",
  "response": "Geen probleem, ik heb geannuleerd. Kan ik je ergens anders mee helpen?"
}

Input: "Wat kun je allemaal?"
Output:
{
  "type": "conversation",
  "response": "Ik kan je helpen met het zoeken en boeken van afspraken! Zeg bijvoorbeeld 'zoek een tandarts' en ik laat je de beste opties zien. Je kunt dan kiezen en ik regel de rest.",
  "topic": "capabilities"
}

GEEF ALLEEN GELDIGE JSON TERUG.`;

// ----- Main Export -----
export async function extractIntent(text: string, context?: { hasProviders?: boolean; hasSelectedProvider?: boolean }): Promise<Intent> {
  if (!OPENAI_API_KEY) {
    throw new IntentParseError("OPENAI_API_KEY is not set");
  }

  if (!text || text.trim().length === 0) {
    throw new IntentParseError("Input text is empty");
  }

  console.log(`[IntentParser] Parsing: "${text}"`);

  // Add context to help with intent detection
  let contextHint = "";
  if (context?.hasProviders && !context?.hasSelectedProvider) {
    contextHint = "\n\nCONTEXT: De gebruiker heeft net een lijst met providers gezien. Als ze een nummer of naam noemen, is dat waarschijnlijk een select_provider intent.";
  } else if (context?.hasSelectedProvider) {
    contextHint = "\n\nCONTEXT: De gebruiker heeft een provider gekozen en ziet nu beschikbare tijdslots. Als ze een tijd of dag noemen, is dat waarschijnlijk een select_datetime intent.";
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT + contextHint },
        { role: "user", content: text },
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const rawResponse = completion.choices[0]?.message?.content;

    if (!rawResponse) {
      throw new IntentParseError("GPT returned empty response");
    }

    console.log(`[IntentParser] Raw GPT response: ${rawResponse}`);

    const parsed = JSON.parse(rawResponse);

    if (!parsed.type) {
      throw new IntentParseError("Missing required field: type", rawResponse);
    }

    const intent: Intent = {
      type: parsed.type as IntentType,
      response: parsed.response,
      topic: parsed.topic,
      selection: parsed.selection,
    };

    if (parsed.task) {
      intent.task = {
        kind: parsed.task.kind || "booking",
        provider_type: parsed.task.provider_type || "tandarts",
        provider_id: parsed.task.provider_id,
        search_query: parsed.task.search_query,
        interval: parsed.task.interval,
        use_profile: parsed.task.use_profile ?? true,
        label: parsed.task.label,
        datetime_preference: parsed.task.datetime_preference,
        time_slot: parsed.task.time_slot,
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
export function describeIntent(intent: Intent): string {
  const { type, task, topic, selection } = intent;

  switch (type) {
    case "conversation":
      return `Gesprek over: ${topic || "algemeen"}`;
    case "search_providers":
      return `Zoeken naar: ${task?.provider_type || "providers"}`;
    case "select_provider":
      return `Provider selectie: ${selection}`;
    case "select_datetime":
      return `Datum/tijd selectie: ${task?.datetime_preference || selection}`;
    case "confirm_action":
      return "Bevestiging";
    case "cancel_action":
      return "Annulering";
    default:
      return `Intent: ${type}`;
  }
}
