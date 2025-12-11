/**
 * Provider Search Service
 *
 * Searches for healthcare providers (tandarts, huisarts, etc.)
 */

import * as fs from "fs";
import * as path from "path";

export interface Provider {
  id: string;
  name: string;
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  availableSlots: string[];
  nextAvailable: string;
  specialties: string[];
  image: string;
}

interface ProvidersData {
  [category: string]: Provider[];
}

// Load providers data
function loadProviders(): ProvidersData {
  const dataPath = path.join(__dirname, "../../data/providers.json");
  const data = fs.readFileSync(dataPath, "utf-8");
  return JSON.parse(data);
}

/**
 * Search for providers by category
 */
export function searchProviders(
  category: string,
  query?: string,
  limit: number = 5
): Provider[] {
  const providers = loadProviders();

  // Normalize category name
  const normalizedCategory = category.toLowerCase();

  // Get providers for this category
  let results = providers[normalizedCategory] || [];

  // If there's a search query, filter by name or specialty
  if (query) {
    const lowerQuery = query.toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.specialties.some((s) => s.toLowerCase().includes(lowerQuery)) ||
        p.address.toLowerCase().includes(lowerQuery)
    );
  }

  // Sort by rating (highest first)
  results.sort((a, b) => b.rating - a.rating);

  // Limit results
  return results.slice(0, limit);
}

/**
 * Get a specific provider by ID
 */
export function getProviderById(id: string): Provider | null {
  const providers = loadProviders();

  for (const category of Object.values(providers)) {
    const found = category.find((p) => p.id === id);
    if (found) return found;
  }

  return null;
}

/**
 * Get available time slots for a provider
 */
export function getAvailableSlots(providerId: string): {
  date: string;
  slots: string[];
}[] {
  // Mock available slots for the next 5 days
  const slots: { date: string; slots: string[] }[] = [];
  const now = new Date();

  for (let i = 1; i <= 5; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const daySlots: string[] = [];

    // Morning slots
    if (Math.random() > 0.3) daySlots.push("09:00");
    if (Math.random() > 0.3) daySlots.push("09:30");
    if (Math.random() > 0.3) daySlots.push("10:00");
    if (Math.random() > 0.5) daySlots.push("10:30");
    if (Math.random() > 0.5) daySlots.push("11:00");

    // Afternoon slots
    if (Math.random() > 0.3) daySlots.push("13:00");
    if (Math.random() > 0.3) daySlots.push("13:30");
    if (Math.random() > 0.5) daySlots.push("14:00");
    if (Math.random() > 0.5) daySlots.push("14:30");
    if (Math.random() > 0.4) daySlots.push("15:00");
    if (Math.random() > 0.6) daySlots.push("15:30");

    if (daySlots.length > 0) {
      slots.push({
        date: date.toISOString().split("T")[0],
        slots: daySlots.sort(),
      });
    }
  }

  return slots;
}

/**
 * Format provider for display
 */
export function formatProviderForSpeech(provider: Provider): string {
  return `${provider.name} op ${provider.address}. Ze hebben een ${provider.rating} rating met ${provider.reviewCount} reviews. Volgende beschikbaarheid is ${provider.nextAvailable}.`;
}

/**
 * Format multiple providers for speech
 */
export function formatProvidersListForSpeech(providers: Provider[]): string {
  if (providers.length === 0) {
    return "Ik heb geen tandartspraktijken gevonden.";
  }

  if (providers.length === 1) {
    return `Ik heb één tandartspraktijk gevonden: ${formatProviderForSpeech(providers[0])}`;
  }

  const list = providers
    .slice(0, 3)
    .map((p, i) => `${i + 1}. ${p.name} met een ${p.rating} rating`)
    .join(". ");

  return `Ik heb ${providers.length} tandartspraktijken gevonden. De top 3 zijn: ${list}. Welke wil je kiezen? Je kunt ook zeggen "kies de beste" en dan kies ik er één voor je.`;
}
