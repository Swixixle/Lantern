/**
 * Wait for PostgreSQL to be ready before running tests.
 * 
 * This script polls the test PostgreSQL instance until it's ready to accept connections.
 * More reliable than sleep-based approaches.
 * 
 * Usage:
 *   tsx tools/wait-for-postgres.ts
 * 
 * Environment variables:
 *   PGHOST - PostgreSQL host (default: localhost)
 *   PGPORT - PostgreSQL port (default: 5433)
 *   PGUSER - PostgreSQL user (default: lantern_test)
 *   PGDATABASE - PostgreSQL database (default: lantern_test)
 *   MAX_WAIT_SECONDS - Maximum time to wait (default: 30)
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const config = {
  host: process.env.PGHOST || "localhost",
  port: process.env.PGPORT || "5433",
  user: process.env.PGUSER || "lantern_test",
  database: process.env.PGDATABASE || "lantern_test",
  maxWaitSeconds: parseInt(process.env.MAX_WAIT_SECONDS || "30", 10),
};

/**
 * Check if PostgreSQL is ready using pg_isready command.
 * Falls back to telnet-style connection test if pg_isready is not available.
 */
async function checkPostgresReady(): Promise<boolean> {
  try {
    // Try pg_isready first (most reliable)
    const { stdout } = await execAsync(
      `pg_isready -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database}`,
      { timeout: 5000 }
    );
    return stdout.includes("accepting connections");
  } catch (error) {
    // pg_isready might not be available, try basic TCP connection
    try {
      // Use Node.js net module via a small inline script
      await execAsync(
        `node -e "require('net').createConnection(${config.port}, '${config.host}').on('connect', () => process.exit(0)).on('error', () => process.exit(1))"`,
        { timeout: 5000 }
      );
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Wait for PostgreSQL to be ready with exponential backoff.
 */
async function waitForPostgres(): Promise<void> {
  const startTime = Date.now();
  const maxWaitMs = config.maxWaitSeconds * 1000;
  let attempt = 0;
  
  console.log(`Waiting for PostgreSQL at ${config.host}:${config.port}...`);
  
  while (Date.now() - startTime < maxWaitMs) {
    attempt++;
    
    try {
      const ready = await checkPostgresReady();
      if (ready) {
        const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`✓ PostgreSQL is ready after ${elapsedSeconds}s (${attempt} attempts)`);
        return;
      }
    } catch (error) {
      // Connection failed, will retry
    }
    
    // Exponential backoff: 0.5s, 1s, 2s, 4s, 8s, capped at 10s
    const backoffMs = Math.min(500 * Math.pow(2, attempt - 1), 10000);
    await new Promise(resolve => setTimeout(resolve, backoffMs));
  }
  
  throw new Error(
    `PostgreSQL not ready after ${config.maxWaitSeconds}s. ` +
    `Check that Docker container is running: docker compose -f docker-compose.test.yml ps`
  );
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  waitForPostgres()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌", error.message);
      process.exit(1);
    });
}

export { waitForPostgres, checkPostgresReady };
