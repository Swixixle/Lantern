/**
 * TEST ONLY - Authentication Bypass for Integration Tests
 * 
 * This module provides a controlled authentication bypass that ONLY works when:
 * 1. NODE_ENV === "test"
 * 2. LANTERN_TEST_AUTH_BYPASS === "true"
 * 3. x-lantern-test-auth header is set to "true" (per-request opt-in)
 * 
 * This allows integration tests to hit protected endpoints without compromising
 * production security. The bypass injects a test user with LEAD_INVESTIGATOR role
 * into req.user, which is expected by RBAC middleware.
 * 
 * SECURITY GUARDRAILS:
 * - Must never activate in production (NODE_ENV check)
 * - Requires explicit opt-in via environment variable
 * - Requires explicit opt-in per request via header
 * - Only injects minimal user shape expected by RBAC
 */

import type { Request, Response, NextFunction } from "express";

/**
 * TEST ONLY.
 * If LANTERN_TEST_AUTH_BYPASS=true AND NODE_ENV=test AND x-lantern-test-auth header is "true",
 * injects req.user with LEAD_INVESTIGATOR role.
 * MUST NOT run unless all three conditions are met.
 * 
 * This middleware should be registered BEFORE route registration but AFTER express.json/urlencoded.
 * 
 * @param req - Express request
 * @param _res - Express response (unused)
 * @param next - Express next function
 */
export function testAuthBypass(req: Request, _res: Response, next: NextFunction) {
  // Hard requirement 1: Both NODE_ENV and explicit bypass flag must be set
  if (process.env.NODE_ENV !== "test" || process.env.LANTERN_TEST_AUTH_BYPASS !== "true") {
    return next();
  }

  // Hard requirement 2: Request must explicitly opt-in via header
  // This proves auth is not bypassed unless test explicitly requests it
  const testAuthHeader = req.headers["x-lantern-test-auth"];
  if (testAuthHeader !== "true") {
    return next();
  }

  // Inject minimal user shape expected by RBAC middleware
  // The RBAC checks req.user.id and then queries the database for roles
  (req as any).user = {
    id: process.env.LANTERN_TEST_USER_ID || "test-user",
    username: "test-bypass-user",
  };

  return next();
}
