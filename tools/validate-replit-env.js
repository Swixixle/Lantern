#!/usr/bin/env node

/**
 * Replit Environment Validation Script
 * 
 * This script checks if all required environment variables and dependencies
 * are properly configured for running Lantern on Replit.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🏮 Lantern - Replit Environment Validator\n");

const checks = [];
let hasErrors = false;

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion >= 20) {
  checks.push({ name: "Node.js version", status: "✅", detail: nodeVersion });
} else {
  checks.push({ name: "Node.js version", status: "❌", detail: `${nodeVersion} (required: 20+)` });
  hasErrors = true;
}

// Check required environment variables
const requiredEnvVars = {
  DATABASE_URL: "PostgreSQL connection string",
  PORT: "Application port (optional, defaults to 5000)"
};

const optionalEnvVars = {
  LANTERN_API_KEY: "API key for restricted endpoints",
  LANTERN_PUBLIC_READONLY: "Public readonly mode flag",
  NODE_ENV: "Node environment (development/production)"
};

console.log("Required Environment Variables:");
for (const [varName, description] of Object.entries(requiredEnvVars)) {
  const value = process.env[varName];
  if (varName === "DATABASE_URL") {
    // Always required
    if (value) {
      checks.push({ name: `  ${varName}`, status: "✅", detail: "Set" });
    } else {
      checks.push({ name: `  ${varName}`, status: "❌", detail: "Missing! Required for database connection." });
      hasErrors = true;
    }
  } else {
    // Optional with defaults
    if (value) {
      checks.push({ name: `  ${varName}`, status: "✅", detail: value });
    } else {
      checks.push({ name: `  ${varName}`, status: "⚠️", detail: "Not set (will use default)" });
    }
  }
}

console.log("\nOptional Environment Variables:");
for (const [varName, description] of Object.entries(optionalEnvVars)) {
  const value = process.env[varName];
  if (value) {
    checks.push({ name: `  ${varName}`, status: "✅", detail: value === "true" || value === "false" ? value : "Set" });
  } else {
    checks.push({ name: `  ${varName}`, status: "ℹ️", detail: "Not set (optional)" });
  }
}

// Print all checks
console.log("\n");
checks.forEach(check => {
  console.log(`${check.status} ${check.name}: ${check.detail}`);
});

// Check if node_modules exists
const nodeModulesPath = path.join(path.dirname(__dirname), 'node_modules');

console.log("\nDependencies:");
if (fs.existsSync(nodeModulesPath)) {
  console.log("✅ node_modules: Installed");
} else {
  console.log("❌ node_modules: Not found! Run 'npm install'");
  hasErrors = true;
}

// Summary
console.log("\n" + "=".repeat(50));
if (hasErrors) {
  console.log("❌ Configuration has errors! Please fix the issues above.");
  console.log("\nQuick fixes:");
  console.log("  1. Ensure PostgreSQL module is enabled in .replit");
  console.log("  2. Run 'npm install' to install dependencies");
  console.log("  3. Check Replit Secrets for DATABASE_URL");
  process.exit(1);
} else {
  console.log("✅ Environment configuration looks good!");
  console.log("\nNext steps:");
  console.log("  1. Run 'npm run db:push' to initialize the database");
  console.log("  2. Run 'npm run dev' to start the application");
  console.log("\nℹ️  See REPLIT_SETUP.md for detailed instructions.");
  process.exit(0);
}
