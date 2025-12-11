/**
 * Handle Command Controller
 *
 * Main orchestrator for voice commands with booking flow:
 * 1. STT: Audio -> Text
 * 2. Intent: Text -> Intent JSON
 * 3. Handle: Based on intent type (search, select, confirm, etc.)
 * 4. TTS: Generate audio response
 */

import {
  transcribeAudio,
  extractIntent,
  generateSpeech,
  audioBufferToBase64,
} from "../../voice";
import { runTask } from "../services/executor";
import {
  searchProviders,
  getProviderById,
  getAvailableSlots,
  Provider,
} from "../services/providerSearch";
import { searchProvidersWithAI, extractLocation } from "../services/aiSearch";
import { sendBookingToN8n, createBookingEventData } from "../services/n8nWebhook";
import { getProfile } from "../services/database";
import { CommandResponse, BookingSession, ExecutionResult, TimeSlot } from "../types";

// In-memory store for booking sessions
const bookingSessions: Map<string, BookingSession> = new Map();

// Clean up expired sessions every minute
setInterval(() => {
  const now = new Date().toISOString();
  for (const [id, session] of bookingSessions.entries()) {
    if (session.expiresAt < now) {
      bookingSessions.delete(id);
      console.log(`[BookingSession] Expired: ${id}`);
    }
  }
}, 60000);

// Current active session (simplified for demo - in production use user IDs)
let currentSessionId: string | null = null;

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createBookingSession(providerType: string): BookingSession {
  const id = generateSessionId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

  const session: BookingSession = {
    id,
    providerType,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  bookingSessions.set(id, session);
  currentSessionId = id;
  console.log(`[BookingSession] Created: ${id}`);

  return session;
}

function getCurrentSession(): BookingSession | null {
  if (!currentSessionId) return null;
  return bookingSessions.get(currentSessionId) || null;
}

function updateSession(updates: Partial<BookingSession>): BookingSession | null {
  const session = getCurrentSession();
  if (!session) return null;

  const updated = { ...session, ...updates };
  bookingSessions.set(session.id, updated);
  return updated;
}

function clearSession(): void {
  if (currentSessionId) {
    bookingSessions.delete(currentSessionId);
    currentSessionId = null;
  }
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
    actionsLog.push(`[STT] "${userTranscript}"`);

    // Get current session for context
    const session = getCurrentSession();
    const context = {
      hasProviders: !!session?.providers,
      hasSelectedProvider: !!session?.selectedProvider,
    };

    // Step 2: Extract Intent with context
    actionsLog.push("[Intent] Analyseren...");
    const intent = await extractIntent(userTranscript, context);
    actionsLog.push(`[Intent] ${intent.type}`);

    // Step 3: Handle based on intent type
    const result = await handleIntent(intent, actionsLog);

    // Step 4: Generate TTS audio
    actionsLog.push("[TTS] Spraak genereren...");
    const audioResponseBuffer = await generateSpeech(result.agentMessage);
    const audioBase64 = audioBufferToBase64(audioResponseBuffer);

    return {
      userTranscript,
      intent,
      agentMessage: result.agentMessage,
      actionsLog,
      audio: audioBase64,
      providers: result.providers,
      selectedProvider: result.selectedProvider,
      availableSlots: result.availableSlots,
      bookingSession: result.bookingSession,
      actionExecuted: result.actionExecuted,
      executionResult: result.executionResult,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    actionsLog.push(`[ERROR] ${errorMessage}`);

    const errorAgentMessage = "Er ging iets mis. Kun je dat nog een keer proberen?";

    let audioBase64 = "";
    try {
      const errorAudio = await generateSpeech(errorAgentMessage);
      audioBase64 = audioBufferToBase64(errorAudio);
    } catch {
      // Continue without audio
    }

    return {
      userTranscript: "",
      intent: { type: "conversation", response: errorAgentMessage },
      agentMessage: errorAgentMessage,
      actionsLog,
      audio: audioBase64,
    };
  }
}

/**
 * Process a text command directly (for testing)
 */
export async function handleTextCommand(text: string): Promise<CommandResponse> {
  const actionsLog: string[] = [];

  try {
    actionsLog.push(`[Input] "${text}"`);

    const session = getCurrentSession();
    const context = {
      hasProviders: !!session?.providers,
      hasSelectedProvider: !!session?.selectedProvider,
    };

    actionsLog.push("[Intent] Analyseren...");
    const intent = await extractIntent(text, context);
    actionsLog.push(`[Intent] ${intent.type}`);

    const result = await handleIntent(intent, actionsLog);

    actionsLog.push("[TTS] Spraak genereren...");
    const audioResponseBuffer = await generateSpeech(result.agentMessage);
    const audioBase64 = audioBufferToBase64(audioResponseBuffer);

    return {
      userTranscript: text,
      intent,
      agentMessage: result.agentMessage,
      actionsLog,
      audio: audioBase64,
      providers: result.providers,
      selectedProvider: result.selectedProvider,
      availableSlots: result.availableSlots,
      bookingSession: result.bookingSession,
      actionExecuted: result.actionExecuted,
      executionResult: result.executionResult,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
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
      intent: { type: "conversation", response: errorAgentMessage },
      agentMessage: errorAgentMessage,
      actionsLog,
      audio: audioBase64,
    };
  }
}

/**
 * Handle intent result interface
 */
interface HandleIntentResult {
  agentMessage: string;
  providers?: Provider[];
  selectedProvider?: Provider;
  availableSlots?: TimeSlot[];
  bookingSession?: BookingSession;
  actionExecuted?: boolean;
  executionResult?: ExecutionResult;
}

/**
 * Handle intent - main logic for booking flow
 */
async function handleIntent(
  intent: Awaited<ReturnType<typeof extractIntent>>,
  actionsLog: string[]
): Promise<HandleIntentResult> {
  const { type } = intent;

  switch (type) {
    case "conversation":
      actionsLog.push("[Chat] Conversatie");
      return {
        agentMessage: intent.response || "Hoe kan ik je helpen?",
      };

    case "search_providers":
      return await handleSearchProviders(intent, actionsLog);

    case "select_provider":
      return await handleSelectProvider(intent, actionsLog);

    case "select_datetime":
      return await handleSelectDateTime(intent, actionsLog);

    case "confirm_action":
      return await handleConfirmAction(actionsLog);

    case "cancel_action":
      clearSession();
      actionsLog.push("[Session] Geannuleerd");
      return {
        agentMessage: intent.response || "Geen probleem, ik heb geannuleerd. Kan ik je ergens anders mee helpen?",
      };

    default:
      return {
        agentMessage: "Ik begrijp je niet helemaal. Kun je dat anders zeggen?",
      };
  }
}

/**
 * Handle search_providers intent
 */
async function handleSearchProviders(
  intent: Awaited<ReturnType<typeof extractIntent>>,
  actionsLog: string[]
): Promise<HandleIntentResult> {
  const providerType = intent.task?.provider_type || "tandarts";
  const searchQuery = intent.task?.search_query;

  // Check if user specified a location
  const location = extractLocation(searchQuery);

  actionsLog.push(`[Search] Zoeken naar ${providerType}${location ? ` in ${location}` : ""}...`);

  let providers: Provider[] = [];

  if (location || searchQuery) {
    // Use AI search for location-specific or custom queries
    actionsLog.push(`[AI] Zoeken met AI naar praktijken in ${location || "Amsterdam"}...`);
    providers = await searchProvidersWithAI(providerType, location || undefined);
  } else {
    // Use static data for generic search
    providers = searchProviders(providerType, searchQuery);
  }

  // If still no providers, use AI as fallback
  if (providers.length === 0) {
    actionsLog.push(`[AI] Fallback: zoeken met AI...`);
    providers = await searchProvidersWithAI(providerType, "Amsterdam");
  }

  if (providers.length === 0) {
    return {
      agentMessage: `Ik kon geen ${providerType}praktijken vinden. Wil je dat ik zoek in een specifieke buurt? Zeg bijvoorbeeld "zoek tandarts in Amsterdam Zuid".`,
    };
  }

  // Create booking session
  const session = createBookingSession(providerType);
  session.providers = providers;
  updateSession({ providers });

  actionsLog.push(`[Search] ${providers.length} resultaten gevonden`);

  // Build response message
  const topProviders = providers.slice(0, 3);
  const providerList = topProviders
    .map((p, i) => `${i + 1}. ${p.name} - ${p.rating} sterren`)
    .join(". ");

  const locationText = location ? ` in ${location}` : "";
  const message = `Ik heb ${providers.length} ${providerType}praktijken${locationText} gevonden! De top 3: ${providerList}. Welke wil je kiezen? Zeg een nummer, de naam, of "kies de beste" en dan kies ik de best beoordeelde voor je.`;

  return {
    agentMessage: message,
    providers,
    bookingSession: session,
  };
}

/**
 * Handle select_provider intent
 */
async function handleSelectProvider(
  intent: Awaited<ReturnType<typeof extractIntent>>,
  actionsLog: string[]
): Promise<HandleIntentResult> {
  const session = getCurrentSession();

  if (!session?.providers || session.providers.length === 0) {
    return {
      agentMessage: "Ik heb nog geen praktijken voor je gezocht. Zeg bijvoorbeeld 'zoek een tandarts' om te beginnen.",
    };
  }

  const selection = intent.selection;
  let selectedProvider: Provider | undefined;

  // Handle different selection types
  if (selection === "beste" || selection === "best") {
    // Pick the highest rated
    selectedProvider = session.providers[0]; // Already sorted by rating
    actionsLog.push(`[Select] Beste gekozen: ${selectedProvider.name}`);
  } else if (typeof selection === "number") {
    // Pick by number
    const index = selection - 1;
    if (index >= 0 && index < session.providers.length) {
      selectedProvider = session.providers[index];
      actionsLog.push(`[Select] Nummer ${selection}: ${selectedProvider.name}`);
    }
  } else if (typeof selection === "string") {
    // Pick by name
    selectedProvider = session.providers.find((p) =>
      p.name.toLowerCase().includes(selection.toLowerCase())
    );
    if (selectedProvider) {
      actionsLog.push(`[Select] Op naam: ${selectedProvider.name}`);
    }
  }

  if (!selectedProvider) {
    return {
      agentMessage: "Ik kon die praktijk niet vinden. Kies een nummer van 1 tot 5, of zeg 'kies de beste'.",
      providers: session.providers,
      bookingSession: session,
    };
  }

  // Update session with selected provider
  updateSession({ selectedProvider });

  // Get available time slots
  const availableSlots = getAvailableSlots(selectedProvider.id);
  updateSession({ availableSlots });

  actionsLog.push(`[Slots] ${availableSlots.length} dagen beschikbaar`);

  // Build response with available slots
  const firstDay = availableSlots[0];
  const slotsPreview = firstDay
    ? `${formatDate(firstDay.date)}: ${firstDay.slots.slice(0, 3).join(", ")}`
    : "Geen slots beschikbaar";

  const message = `Je hebt gekozen voor ${selectedProvider.name}. Wanneer wil je de afspraak? De eerste beschikbare dag is ${slotsPreview}. Je kunt ook zeggen "morgen om 10 uur" of "de eerste beschikbare".`;

  return {
    agentMessage: message,
    selectedProvider,
    availableSlots,
    bookingSession: getCurrentSession() || undefined,
  };
}

/**
 * Handle select_datetime intent
 */
async function handleSelectDateTime(
  intent: Awaited<ReturnType<typeof extractIntent>>,
  actionsLog: string[]
): Promise<HandleIntentResult> {
  const session = getCurrentSession();

  if (!session?.selectedProvider) {
    return {
      agentMessage: "Kies eerst een praktijk voordat je een tijd kiest.",
    };
  }

  if (!session.availableSlots || session.availableSlots.length === 0) {
    return {
      agentMessage: "Er zijn geen beschikbare tijdslots. Probeer een andere praktijk.",
    };
  }

  let selectedDate: string | undefined;
  let selectedTime: string | undefined;

  const selection = intent.selection;

  if (selection === "eerste" || selection === "first") {
    // Pick the first available slot
    const firstDay = session.availableSlots[0];
    selectedDate = firstDay.date;
    selectedTime = firstDay.slots[0];
  } else if (intent.task?.datetime_preference || intent.task?.time_slot) {
    // Parse the preference
    const pref = intent.task.datetime_preference?.toLowerCase() || "";
    const timeSlot = intent.task.time_slot;

    // Find matching date
    if (pref.includes("morgen") || pref.includes("tomorrow")) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      selectedDate = tomorrow.toISOString().split("T")[0];
    } else if (pref.includes("overmorgen")) {
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);
      selectedDate = dayAfter.toISOString().split("T")[0];
    } else {
      // Default to first available date
      selectedDate = session.availableSlots[0]?.date;
    }

    // Find time slot
    if (timeSlot) {
      selectedTime = timeSlot;
    } else {
      // Default to first slot of that day
      const daySlots = session.availableSlots.find((s) => s.date === selectedDate);
      selectedTime = daySlots?.slots[0];
    }
  }

  if (!selectedDate || !selectedTime) {
    // Default to first available
    const firstDay = session.availableSlots[0];
    selectedDate = firstDay.date;
    selectedTime = firstDay.slots[0];
  }

  // Update session
  updateSession({
    selectedDateTime: { date: selectedDate, time: selectedTime },
  });

  actionsLog.push(`[DateTime] ${selectedDate} om ${selectedTime}`);

  // Build confirmation message
  const provider = session.selectedProvider;
  const message = `Perfect! Ik ga een afspraak boeken bij ${provider.name} op ${formatDate(selectedDate)} om ${selectedTime}. Je gegevens worden automatisch ingevuld. Zeg "ja" om te bevestigen of "nee" om te annuleren.`;

  return {
    agentMessage: message,
    selectedProvider: provider,
    bookingSession: getCurrentSession() || undefined,
  };
}

/**
 * Handle confirm_action intent - execute the booking
 */
async function handleConfirmAction(actionsLog: string[]): Promise<HandleIntentResult> {
  const session = getCurrentSession();

  if (!session?.selectedProvider || !session?.selectedDateTime) {
    return {
      agentMessage: "Er is geen afspraak om te bevestigen. Zeg 'zoek een tandarts' om te beginnen.",
    };
  }

  actionsLog.push(`[Booking] Bevestigd! Uitvoeren...`);

  // Execute the booking via Playwright
  const task = {
    kind: "booking" as const,
    provider_type: session.providerType,
    provider_id: session.selectedProvider.id,
    datetime_preference: `${session.selectedDateTime.date}T${session.selectedDateTime.time}`,
    use_profile: true,
  };

  const result = await runTask(task);

  if (result.success) {
    actionsLog.push(`[Booking] Voltooid!`);

    // Send to n8n for Google Calendar integration
    const profile = getProfile();
    if (profile) {
      actionsLog.push(`[Calendar] Toevoegen aan Google Calendar...`);

      const eventData = createBookingEventData({
        providerName: session.selectedProvider.name,
        providerAddress: session.selectedProvider.address,
        providerPhone: session.selectedProvider.phone,
        dateTime: session.selectedDateTime,
        userName: profile.name,
        userEmail: profile.email,
        userPhone: profile.phone,
        providerType: session.providerType,
      });

      const calendarSuccess = await sendBookingToN8n(eventData);
      if (calendarSuccess) {
        actionsLog.push(`[Calendar] Toegevoegd aan agenda!`);
      } else {
        actionsLog.push(`[Calendar] Kon niet toevoegen (n8n niet actief?)`);
      }
    }

    const message = `Je afspraak bij ${session.selectedProvider.name} op ${formatDate(session.selectedDateTime.date)} om ${session.selectedDateTime.time} is geboekt! ${result.confirmationText || ""} De afspraak is toegevoegd aan je Google Calendar. Kan ik je nog ergens anders mee helpen?`;

    // Clear session after successful booking
    clearSession();

    return {
      agentMessage: message,
      actionExecuted: true,
      executionResult: result,
    };
  } else {
    actionsLog.push(`[Booking] Mislukt: ${result.error}`);

    return {
      agentMessage: `Er ging iets mis bij het boeken: ${result.error}. Wil je het opnieuw proberen?`,
      executionResult: result,
    };
  }
}

/**
 * Format date for speech
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
  };
  return date.toLocaleDateString("nl-NL", options);
}
