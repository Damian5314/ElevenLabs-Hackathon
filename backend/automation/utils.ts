/**
 * Playwright Utility Functions
 *
 * Shared helpers for browser automation scripts.
 *
 * Required Selectors for Dummy Sites:
 * ====================================
 * tandarts.html:
 *   - #appointment-form - Form container
 *   - #name            - Name input
 *   - #email           - Email input
 *   - #phone           - Phone input
 *   - #datetime        - Datetime-local input
 *   - #submit          - Submit button
 *   - #confirmation    - Confirmation div (appears after submit)
 *
 * event.html:
 *   - #event-form      - Form container
 *   - #name            - Name input
 *   - #email           - Email input
 *   - #company         - Company input (optional)
 *   - #dietary         - Dietary select (optional)
 *   - #submit          - Submit button
 *   - #confirmation    - Confirmation div (appears after submit)
 */

import { chromium, Browser, Page, BrowserContext } from "playwright";

// ----- Configuration -----
const DEFAULT_HEADLESS = process.env.HEADLESS !== "false";
const DEFAULT_TIMEOUT = 30000; // 30 seconds

export interface BrowserOptions {
  headless?: boolean;
  timeout?: number;
  slowMo?: number; // Slow down operations for demo visibility
}

/**
 * Execute a function with a managed browser instance.
 *
 * Handles browser lifecycle (launch, create page, cleanup) automatically.
 * Use this for simple single-page automations.
 *
 * @param fn - Async function that receives a Page and returns a result
 * @param options - Browser configuration options
 * @returns Promise with the result of fn
 *
 * @example
 * ```ts
 * const result = await withBrowser(async (page) => {
 *   await page.goto('http://localhost:3001/tandarts.html');
 *   await page.fill('#name', 'Jan');
 *   await page.click('#submit');
 *   return await page.textContent('#confirmation');
 * });
 * ```
 */
export async function withBrowser<T>(
  fn: (page: Page) => Promise<T>,
  options: BrowserOptions = {}
): Promise<T> {
  const {
    headless = DEFAULT_HEADLESS,
    timeout = DEFAULT_TIMEOUT,
    slowMo = 0,
  } = options;

  let browser: Browser | null = null;

  try {
    console.log(`[Playwright] Launching browser (headless: ${headless})...`);

    browser = await chromium.launch({
      headless,
      slowMo,
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    // Set default timeout for all operations
    context.setDefaultTimeout(timeout);

    const page = await context.newPage();

    // Execute the provided function
    const result = await fn(page);

    // Cleanup
    await context.close();
    await browser.close();

    console.log("[Playwright] Browser closed successfully");
    return result;
  } catch (error) {
    console.error("[Playwright] Error during browser automation:", error);

    // Ensure browser is closed even on error
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore close errors
      }
    }

    throw error;
  }
}

/**
 * Execute a function with a managed browser context (multiple pages).
 *
 * Use this when you need to work with multiple pages or tabs.
 *
 * @param fn - Async function that receives a BrowserContext
 * @param options - Browser configuration options
 */
export async function withBrowserContext<T>(
  fn: (context: BrowserContext) => Promise<T>,
  options: BrowserOptions = {}
): Promise<T> {
  const { headless = DEFAULT_HEADLESS, timeout = DEFAULT_TIMEOUT } = options;

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless });
    const context = await browser.newContext();
    context.setDefaultTimeout(timeout);

    const result = await fn(context);

    await context.close();
    await browser.close();

    return result;
  } catch (error) {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore
      }
    }
    throw error;
  }
}

/**
 * Wait for an element and get its text content.
 */
export async function waitAndGetText(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<string> {
  await page.waitForSelector(selector, { timeout });
  const text = await page.textContent(selector);
  return text?.trim() || "";
}

/**
 * Fill a form field if it exists, otherwise skip.
 */
export async function fillIfExists(
  page: Page,
  selector: string,
  value: string
): Promise<boolean> {
  const element = await page.$(selector);
  if (element) {
    await page.fill(selector, value);
    return true;
  }
  return false;
}

/**
 * Take a screenshot for debugging.
 */
export async function debugScreenshot(
  page: Page,
  name: string = "debug"
): Promise<void> {
  const timestamp = Date.now();
  const path = `/tmp/playwright-${name}-${timestamp}.png`;
  await page.screenshot({ path });
  console.log(`[Playwright] Screenshot saved: ${path}`);
}
