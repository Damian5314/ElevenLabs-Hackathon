/**
 * Playwright Script - Dentist Appointment Booking
 *
 * Automates booking a dentist appointment on the dummy tandarts.html page.
 */

import { chromium, Browser, Page } from "playwright";
import { Profile } from "../api/types";

export interface DentistBookingParams {
  profile: Profile;
  datetime_preference?: string;
  headless?: boolean;
}

export interface DentistBookingResult {
  success: boolean;
  message: string;
  confirmationText?: string;
  error?: string;
}

/**
 * Book a dentist appointment on the dummy website
 * @param params - Booking parameters including profile and datetime preference
 * @param baseUrl - Base URL where dummy sites are served (default: http://localhost:3001)
 */
export async function bookDentistAppointment(
  params: DentistBookingParams,
  baseUrl: string = "http://localhost:3001"
): Promise<DentistBookingResult> {
  const { profile, datetime_preference, headless = true } = params;

  let browser: Browser | null = null;

  try {
    console.log("[Playwright/Dentist] Starting browser...");

    browser = await chromium.launch({
      headless,
    });

    const page = await browser.newPage();

    // Navigate to the dentist booking page
    const pageUrl = `${baseUrl}/tandarts.html`;
    console.log(`[Playwright/Dentist] Navigating to: ${pageUrl}`);

    await page.goto(pageUrl, { waitUntil: "domcontentloaded" });

    // Wait for the form to be ready
    await page.waitForSelector("#appointment-form", { timeout: 5000 });

    console.log("[Playwright/Dentist] Filling form...");

    // Fill in the form fields
    await page.fill("#name", profile.name);
    await page.fill("#email", profile.email);
    await page.fill("#phone", profile.phone);

    // Set the datetime - use preference or generate a default
    const datetime = generateDateTime(datetime_preference);
    await page.fill("#datetime", datetime);

    console.log(`[Playwright/Dentist] Form filled with datetime: ${datetime}`);

    // Submit the form
    await page.click("#submit");

    // Wait for confirmation
    await page.waitForSelector("#confirmation", { timeout: 5000 });

    // Get the confirmation text
    const confirmationText = await page.textContent("#confirmation");

    console.log(`[Playwright/Dentist] Confirmation: ${confirmationText}`);

    await browser.close();

    return {
      success: true,
      message: "Tandartsafspraak succesvol geboekt",
      confirmationText: confirmationText?.trim() || undefined,
    };
  } catch (error) {
    console.error("[Playwright/Dentist] Error:", error);

    if (browser) {
      await browser.close();
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      message: "Fout bij het boeken van de tandartsafspraak",
      error: errorMessage,
    };
  }
}

/**
 * Generate a datetime string for the appointment
 */
function generateDateTime(preference?: string): string {
  const now = new Date();

  // Default to next available morning slot (tomorrow at 09:00)
  let targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + 1);
  targetDate.setHours(9, 0, 0, 0);

  // Adjust based on preference
  if (preference) {
    const lowerPref = preference.toLowerCase();

    if (lowerPref.includes("volgende week") || lowerPref.includes("next week")) {
      targetDate.setDate(targetDate.getDate() + 7);
    } else if (lowerPref.includes("morgen") || lowerPref.includes("tomorrow")) {
      // Already set to tomorrow
    } else if (lowerPref.includes("ochtend") || lowerPref.includes("morning")) {
      targetDate.setHours(9, 0, 0, 0);
    } else if (lowerPref.includes("middag") || lowerPref.includes("afternoon")) {
      targetDate.setHours(14, 0, 0, 0);
    } else if (lowerPref.includes("maand") || lowerPref.includes("month")) {
      targetDate.setMonth(targetDate.getMonth() + 1);
    }
  }

  // Skip weekends
  while (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  // Format as datetime-local value: YYYY-MM-DDTHH:mm
  return formatDateTimeLocal(targetDate);
}

/**
 * Format date for datetime-local input
 */
function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
