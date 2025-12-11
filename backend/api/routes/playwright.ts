/**
 * Playwright Routes - /playwright/*
 *
 * Browser automation endpoints for booking and form filling.
 */

import { Router, Request, Response } from "express";
import { chromium, Browser, Page } from "playwright";
import {
  PlaywrightBookingRequest,
  PlaywrightBookingResponse,
  PlaywrightFormRequest,
  PlaywrightFormResponse,
} from "../types";

const router = Router();

// Browser configuration
const HEADLESS = process.env.HEADLESS !== "false";
const DEFAULT_TIMEOUT = 30000;

/**
 * Generate unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Take screenshot and return as base64
 */
async function takeScreenshot(page: Page): Promise<string> {
  try {
    const screenshotBuffer = await page.screenshot();
    return screenshotBuffer.toString("base64");
  } catch (error) {
    console.error("[Playwright] Failed to take screenshot:", error);
    return "";
  }
}

/**
 * POST /playwright/book-appointment
 *
 * Books an appointment via browser automation.
 */
router.post("/book-appointment", async (req: Request, res: Response) => {
  console.log("[Playwright] POST /playwright/book-appointment");

  const { profile, intent } = req.body as PlaywrightBookingRequest;

  // Validate request
  if (!profile || !intent) {
    return res.status(400).json({
      success: false,
      error: "Missing profile or intent",
    });
  }

  if (!intent.providerUrl) {
    return res.status(400).json({
      success: false,
      error: "Missing providerUrl in intent",
    });
  }

  let browser: Browser | null = null;

  try {
    console.log(`[Playwright] Starting booking at: ${intent.providerUrl}`);

    // Launch browser
    browser = await chromium.launch({
      headless: HEADLESS,
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();
    page.setDefaultTimeout(DEFAULT_TIMEOUT);

    // Navigate to booking site
    await page.goto(intent.providerUrl, { waitUntil: "domcontentloaded" });
    console.log("[Playwright] Page loaded");

    // Fill in form fields (generic selectors - adjust based on actual site)
    // Try common form field selectors
    const nameSelectors = ['input[name="name"]', 'input[id="name"]', 'input[placeholder*="naam"]', '#name'];
    const emailSelectors = ['input[name="email"]', 'input[id="email"]', 'input[type="email"]', '#email'];
    const phoneSelectors = ['input[name="phone"]', 'input[id="phone"]', 'input[type="tel"]', '#phone'];
    const dateSelectors = ['input[name="date"]', 'input[id="date"]', 'input[type="date"]', '#datetime', 'input[name="datetime"]'];

    // Fill name
    for (const selector of nameSelectors) {
      const element = await page.$(selector);
      if (element) {
        await element.fill(profile.name);
        console.log(`[Playwright] Filled name: ${selector}`);
        break;
      }
    }

    // Fill email
    for (const selector of emailSelectors) {
      const element = await page.$(selector);
      if (element) {
        await element.fill(profile.email);
        console.log(`[Playwright] Filled email: ${selector}`);
        break;
      }
    }

    // Fill phone
    for (const selector of phoneSelectors) {
      const element = await page.$(selector);
      if (element) {
        await element.fill(profile.phone);
        console.log(`[Playwright] Filled phone: ${selector}`);
        break;
      }
    }

    // Fill date/time
    if (intent.appointmentDate) {
      for (const selector of dateSelectors) {
        const element = await page.$(selector);
        if (element) {
          // Format date for input
          const date = new Date(intent.appointmentDate);
          const formattedDate = date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
          await element.fill(formattedDate);
          console.log(`[Playwright] Filled date: ${selector}`);
          break;
        }
      }
    }

    // Look for submit button
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      '#submit',
      'button:has-text("Submit")',
      'button:has-text("Boek")',
      'button:has-text("Bevestig")',
    ];

    let submitted = false;
    for (const selector of submitSelectors) {
      const button = await page.$(selector);
      if (button) {
        await button.click();
        console.log(`[Playwright] Clicked submit: ${selector}`);
        submitted = true;
        break;
      }
    }

    if (!submitted) {
      console.warn("[Playwright] No submit button found");
    }

    // Wait for confirmation (try various selectors)
    let confirmationNumber = "";
    const confirmationSelectors = [
      ".confirmation",
      "#confirmation",
      ".confirmation-number",
      ".success",
      ".booking-confirmed",
    ];

    await page.waitForTimeout(2000); // Wait for page update

    for (const selector of confirmationSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          confirmationNumber = await element.textContent() || "";
          console.log(`[Playwright] Found confirmation: ${confirmationNumber}`);
          break;
        }
      } catch {
        // Continue to next selector
      }
    }

    // Take screenshot
    const screenshot = await takeScreenshot(page);

    await browser.close();
    browser = null;

    const response: PlaywrightBookingResponse = {
      success: true,
      appointmentId: generateId("apt"),
      confirmationNumber: confirmationNumber || "CONF-" + Date.now(),
      bookedAt: new Date().toISOString(),
      screenshot,
    };

    console.log("[Playwright] Booking completed successfully");
    return res.json(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Playwright] Booking failed:", error);

    if (browser) {
      await browser.close();
    }

    return res.status(500).json({
      success: false,
      error: errorMessage,
    } as PlaywrightBookingResponse);
  }
});

/**
 * POST /playwright/fill-form
 *
 * Fills an online form via browser automation.
 */
router.post("/fill-form", async (req: Request, res: Response) => {
  console.log("[Playwright] POST /playwright/fill-form");

  const { profile, intent } = req.body as PlaywrightFormRequest;

  // Validate request
  if (!profile || !intent) {
    return res.status(400).json({
      success: false,
      error: "Missing profile or intent",
    });
  }

  if (!intent.formUrl) {
    return res.status(400).json({
      success: false,
      error: "Missing formUrl in intent",
    });
  }

  let browser: Browser | null = null;

  try {
    console.log(`[Playwright] Starting form fill at: ${intent.formUrl}`);

    // Launch browser
    browser = await chromium.launch({
      headless: HEADLESS,
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();
    page.setDefaultTimeout(DEFAULT_TIMEOUT);

    // Navigate to form
    await page.goto(intent.formUrl, { waitUntil: "domcontentloaded" });
    console.log("[Playwright] Page loaded");

    // Fill standard fields
    const fieldMappings: { [key: string]: string[] } = {
      name: ['input[name="name"]', '#name', 'input[placeholder*="naam"]'],
      email: ['input[name="email"]', '#email', 'input[type="email"]'],
      phone: ['input[name="phone"]', '#phone', 'input[type="tel"]'],
    };

    // Fill profile fields
    for (const [field, selectors] of Object.entries(fieldMappings)) {
      const value = profile[field as keyof typeof profile];
      if (value) {
        for (const selector of selectors) {
          const element = await page.$(selector);
          if (element) {
            await element.fill(String(value));
            console.log(`[Playwright] Filled ${field}: ${selector}`);
            break;
          }
        }
      }
    }

    // Fill additional fields
    if (intent.additionalFields) {
      for (const [fieldName, fieldValue] of Object.entries(intent.additionalFields)) {
        const selectors = [
          `input[name="${fieldName}"]`,
          `#${fieldName}`,
          `select[name="${fieldName}"]`,
          `textarea[name="${fieldName}"]`,
        ];

        for (const selector of selectors) {
          const element = await page.$(selector);
          if (element) {
            const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
            if (tagName === "select") {
              await element.selectOption(fieldValue);
            } else {
              await element.fill(fieldValue);
            }
            console.log(`[Playwright] Filled ${fieldName}: ${selector}`);
            break;
          }
        }
      }
    }

    // Look for submit button
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      '#submit',
      'button:has-text("Submit")',
      'button:has-text("Verstuur")',
      'button:has-text("Aanmelden")',
    ];

    let submitted = false;
    for (const selector of submitSelectors) {
      const button = await page.$(selector);
      if (button) {
        await button.click();
        console.log(`[Playwright] Clicked submit: ${selector}`);
        submitted = true;
        break;
      }
    }

    if (!submitted) {
      console.warn("[Playwright] No submit button found");
    }

    // Wait for success indicator
    await page.waitForTimeout(2000);

    // Take screenshot
    const screenshot = await takeScreenshot(page);

    await browser.close();
    browser = null;

    const response: PlaywrightFormResponse = {
      success: true,
      formId: generateId("form"),
      submittedAt: new Date().toISOString(),
      screenshot,
    };

    console.log("[Playwright] Form fill completed successfully");
    return res.json(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Playwright] Form fill failed:", error);

    if (browser) {
      await browser.close();
    }

    return res.status(500).json({
      success: false,
      error: errorMessage,
    } as PlaywrightFormResponse);
  }
});

export default router;
