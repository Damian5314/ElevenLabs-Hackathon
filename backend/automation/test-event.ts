/**
 * Test Script - Event Form
 *
 * Run with: npm run test:event
 *
 * Make sure the backend is running first: npm run dev
 */

import { fillEventForm } from "./eventForm";

async function main() {
  console.log("=".repeat(50));
  console.log("  Testing Event Form Automation");
  console.log("=".repeat(50));
  console.log("");

  const testProfile = {
    name: "Test Gebruiker",
    email: "test@example.com",
    phone: "06-12345678",
  };

  console.log("Profile:", testProfile);
  console.log("Target: http://localhost:3001/event.html");
  console.log("");
  console.log("Starting browser automation...");
  console.log("");

  try {
    const result = await fillEventForm(
      {
        profile: testProfile,
        eventName: "Tech Meetup 2024",
        headless: false, // Show browser for testing
      },
      "http://localhost:3001"
    );

    console.log("");
    console.log("=".repeat(50));
    console.log("  RESULT");
    console.log("=".repeat(50));
    console.log("Success:", result.success);
    console.log("Message:", result.message);
    if (result.confirmationText) {
      console.log("Confirmation:", result.confirmationText);
    }
    if (result.error) {
      console.log("Error:", result.error);
    }
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

main();
