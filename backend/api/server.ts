/**
 * LifeAdmin Backend Server
 *
 * Start with: npm run dev
 */

import "dotenv/config";
import app from "./app";
import { closeBrowser } from "./services/executor";

const PORT = process.env.PORT || 3001;

// Start server
const server = app.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log("  <™  LifeAdmin Backend Server");
  console.log("=".repeat(50));
  console.log(`  =á Server running on http://localhost:${PORT}`);
  console.log(`  = API endpoints:`);
  console.log(`     - POST /api/command (voice commands)`);
  console.log(`     - GET  /api/check-workflows (n8n cron)`);
  console.log(`     - GET  /api/health (health check)`);
  console.log("=".repeat(50));
  console.log("");
  console.log("  Environment:");
  console.log(`  - STT Provider: ${process.env.STT_PROVIDER || "whisper"}`);
  console.log(`  - OpenAI API Key: ${process.env.OPENAI_API_KEY ? " Set" : "L Missing"}`);
  console.log(`  - ElevenLabs Key: ${process.env.ELEVENLABS_API_KEY ? " Set" : "L Missing"}`);
  console.log("");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n[Server] Shutting down gracefully...");
  await closeBrowser();
  server.close(() => {
    console.log("[Server] Server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", async () => {
  console.log("\n[Server] Received SIGTERM, shutting down...");
  await closeBrowser();
  server.close(() => {
    process.exit(0);
  });
});
