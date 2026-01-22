import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

const isDev = process.env.NODE_ENV !== "production";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // /__boot - Plain HTML boot test (dev-only, 404 in prod)
  app.get("/__boot", (_req, res) => {
    if (!isDev) {
      return res.status(404).send("Not Found");
    }
    const timestamp = new Date().toISOString();
    const html = `<!DOCTYPE html>
<html>
<head><title>Boot Test</title></head>
<body style="background:#111;color:#0f0;font-family:monospace;padding:40px;">
  <h1 style="font-size:48px;margin-bottom:20px;">BOOT OK</h1>
  <p>Timestamp: ${timestamp}</p>
  <p>PID: ${process.pid}</p>
  <p>Server is responding correctly.</p>
  <hr style="border-color:#333;margin:20px 0;">
  <p><a href="/" style="color:#0ff;font-size:18px;">Open App →</a></p>
  <p><a href="/__health" style="color:#0ff;">Check Health JSON</a></p>
</body>
</html>`;
    res.type("html").send(html);
  });

  // /__health - JSON health check (dev-only, 404 in prod)
  app.get("/__health", (_req, res) => {
    if (!isDev) {
      return res.status(404).send("Not Found");
    }
    res.json({
      ok: true,
      time: new Date().toISOString(),
      pid: process.pid,
      env: process.env.NODE_ENV || "development"
    });
  });

  return httpServer;
}
