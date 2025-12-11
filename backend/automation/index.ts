/**
 * Automation Module - Central export for all Playwright scripts
 *
 * This module provides browser automation capabilities for LifeAdmin.
 * It includes scripts for:
 * - Dentist appointment booking (tandarts.html)
 * - Event registration (event.html)
 *
 * The automation is triggered by:
 * 1. Direct voice commands (via executor.ts)
 * 2. n8n cron workflows (via /api/check-workflows)
 */

// ----- Dentist Booking -----
export {
  bookDentistAppointment,
  type DentistBookingParams,
  type DentistBookingResult,
} from "./dentistBooking";

// ----- Event Form -----
export {
  fillEventForm,
  type EventFormParams,
  type EventFormResult,
} from "./eventForm";

// ----- Utilities -----
export {
  withBrowser,
  withBrowserContext,
  waitAndGetText,
  fillIfExists,
  debugScreenshot,
  type BrowserOptions,
} from "./utils";
