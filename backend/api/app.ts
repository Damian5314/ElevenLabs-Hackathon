/**
 * Express App Configuration
 */

import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import commandRoutes from "./routes/command";
import checkWorkflowsRoutes from "./routes/checkWorkflows";
import profileRoutes from "./routes/profile";
import workflowsRoutes from "./routes/workflows";

const app: Application = express();

// ----- Middleware -----

// CORS - allow frontend to connect
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);

// Parse JSON bodies
app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ----- Static Files -----

// Serve dummy-sites for Playwright automation
const dummySitesPath = path.join(__dirname, "../../dummy-sites");
app.use(express.static(dummySitesPath));
console.log(`[App] Serving static files from: ${dummySitesPath}`);

// ----- Routes -----

// Health check with dependency status
app.get("/api/health", (req: Request, res: Response) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "LifeAdmin Backend",
    dependencies: {
      openai: !!process.env.OPENAI_API_KEY,
      elevenlabs: !!process.env.ELEVENLABS_API_KEY,
    },
    config: {
      sttProvider: process.env.STT_PROVIDER || "whisper",
      headless: process.env.HEADLESS !== "false",
    },
  };

  // Return 503 if critical dependencies are missing
  if (!health.dependencies.openai || !health.dependencies.elevenlabs) {
    return res.status(503).json({
      ...health,
      status: "degraded",
      message: "Missing required API keys",
    });
  }

  res.json(health);
});

// Main command endpoint
app.use("/api/command", commandRoutes);

// Workflow scheduler endpoint (for n8n)
app.use("/api/check-workflows", checkWorkflowsRoutes);

// Profile management
app.use("/api/profile", profileRoutes);

// Workflow management
app.use("/api/workflows", workflowsRoutes);

// ----- Error Handling -----

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("[App] Unhandled error:", err);

  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
  });
});

export default app;
