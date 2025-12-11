/**
 * Playwright Script - Event Registration Form
 *
 * Automates filling the event registration form on the dummy event.html page.
 */

import { chromium, Browser, Page } from "playwright";
import { Profile } from "../api/types";

export interface EventFormParams {
  profile: Profile;
  eventName?: string;
  headless?: boolean;
}

export interface EventFormResult {
  success: boolean;
  message: string;
  confirmationText?: string;
  error?: string;
}

/**
 * Fill the event registration form on the dummy website
 * @param params - Form parameters including profile and event name
 * @param baseUrl - Base URL where dummy sites are served (default: http://localhost:3001)
 */
export async function fillEventForm(
  params: EventFormParams,
  baseUrl: string = "http://localhost:3001"
): Promise<EventFormResult> {
  const { profile, eventName, headless = true } = params;

  let browser: Browser | null = null;

  try {
    console.log("[Playwright/Event] Starting browser...");

    browser = await chromium.launch({
      headless,
    });

    const page = await browser.newPage();

    // Navigate to the event registration page
    const pageUrl = `${baseUrl}/event.html`;
    console.log(`[Playwright/Event] Navigating to: ${pageUrl}`);

    await page.goto(pageUrl, { waitUntil: "domcontentloaded" });

    // Wait for the form to be ready
    await page.waitForSelector("#event-form", { timeout: 5000 });

    console.log("[Playwright/Event] Filling form...");

    // Fill in the form fields
    await page.fill("#name", profile.name);
    await page.fill("#email", profile.email);

    // If there's a phone field, fill it
    const phoneField = await page.$("#phone");
    if (phoneField) {
      await page.fill("#phone", profile.phone);
    }

    // If there's a comments/message field
    const commentsField = await page.$("#comments");
    if (commentsField && eventName) {
      await page.fill("#comments", `Graag aanmelden voor: ${eventName}`);
    }

    console.log("[Playwright/Event] Form filled");

    // Submit the form
    await page.click("#submit");

    // Wait for confirmation
    await page.waitForSelector("#confirmation", { timeout: 5000 });

    // Get the confirmation text
    const confirmationText = await page.textContent("#confirmation");

    console.log(`[Playwright/Event] Confirmation: ${confirmationText}`);

    await browser.close();

    return {
      success: true,
      message: "Eventinschrijving succesvol verstuurd",
      confirmationText: confirmationText?.trim() || undefined,
    };
  } catch (error) {
    console.error("[Playwright/Event] Error:", error);

    if (browser) {
      await browser.close();
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      message: "Fout bij het invullen van het eventformulier",
      error: errorMessage,
    };
  }
}
