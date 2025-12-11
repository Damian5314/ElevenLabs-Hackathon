/**
 * n8n Webhook Service
 *
 * Sends booking data to n8n for external integrations like Google Calendar
 */

// n8n webhook URL
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "https://wishh.app.n8n.cloud/webhook/lifeadmin-booking";

export interface BookingEventData {
  // Event details
  title: string;
  description: string;
  location: string;
  // Timing
  startDateTime: string; // ISO format
  endDateTime: string;   // ISO format
  // Provider info
  providerName: string;
  providerPhone: string;
  providerAddress: string;
  // User info
  userName: string;
  userEmail: string;
  userPhone: string;
  // Meta
  bookingId: string;
  bookedAt: string;
}

/**
 * Send booking to n8n webhook for calendar integration
 */
export async function sendBookingToN8n(data: BookingEventData): Promise<boolean> {
  console.log(`[n8n] Sending booking to webhook: ${data.title}`);

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      console.log(`[n8n] Webhook success: ${response.status}`);
      return true;
    } else {
      console.error(`[n8n] Webhook failed: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    // Don't fail the booking if n8n is not running
    console.error(`[n8n] Webhook error (n8n might not be running):`, error);
    return false;
  }
}

/**
 * Create booking event data from booking details
 */
export function createBookingEventData(params: {
  providerName: string;
  providerAddress: string;
  providerPhone: string;
  dateTime: { date: string; time: string };
  userName: string;
  userEmail: string;
  userPhone: string;
  providerType: string;
}): BookingEventData {
  const { providerName, providerAddress, providerPhone, dateTime, userName, userEmail, userPhone, providerType } = params;

  // Create start datetime
  const startDate = new Date(`${dateTime.date}T${dateTime.time}:00`);

  // End time is 30 minutes later (typical appointment duration)
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

  // Create title based on provider type
  const typeLabel = providerType === "tandarts" ? "Tandarts" : providerType;
  const title = `${typeLabel} afspraak - ${providerName}`;

  // Create description
  const description = `Afspraak geboekt via LifeAdmin

📍 Locatie: ${providerAddress}
📞 Telefoon: ${providerPhone}

👤 Geboekt voor: ${userName}
📧 Email: ${userEmail}
📱 Telefoon: ${userPhone}

---
Automatisch toegevoegd door LifeAdmin`;

  return {
    title,
    description,
    location: providerAddress,
    startDateTime: startDate.toISOString(),
    endDateTime: endDate.toISOString(),
    providerName,
    providerPhone,
    providerAddress,
    userName,
    userEmail,
    userPhone,
    bookingId: `booking_${Date.now()}`,
    bookedAt: new Date().toISOString(),
  };
}
