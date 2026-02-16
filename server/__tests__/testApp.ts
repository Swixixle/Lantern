/**
 * Test app factory for HTTP integration tests.
 * Creates an Express app instance configured like production.
 */

import express, { type Express } from "express";
import { createServer } from "http";

/**
 * Creates a test Express app with all routes registered.
 * 
 * @returns Express app instance for testing
 */
export async function createTestApp(): Promise<Express> {
  const app = express();
  
  // Middleware setup (same as production)
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  
  // Register routes
  const httpServer = createServer(app);
  const { registerRoutes } = await import("../routes");
  await registerRoutes(httpServer, app);
  
  return app;
}
