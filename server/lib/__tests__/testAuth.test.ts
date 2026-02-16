/**
 * Unit tests for testAuth bypass middleware
 * 
 * Ensures the bypass ONLY works when all three conditions are met:
 * 1. NODE_ENV === "test"
 * 2. LANTERN_TEST_AUTH_BYPASS === "true"
 * 3. x-lantern-test-auth header === "true"
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { testAuthBypass } from "../testAuth";
import type { Request, Response, NextFunction } from "express";

describe("testAuthBypass middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextCalled: boolean;
  let mockNext: NextFunction;
  
  // Store original env values
  let originalNodeEnv: string | undefined;
  let originalBypassFlag: string | undefined;
  let originalTestUserId: string | undefined;

  beforeEach(() => {
    // Save original env vars
    originalNodeEnv = process.env.NODE_ENV;
    originalBypassFlag = process.env.LANTERN_TEST_AUTH_BYPASS;
    originalTestUserId = process.env.LANTERN_TEST_USER_ID;
    
    // Setup mock objects with headers
    mockReq = {
      headers: {}
    };
    mockRes = {};
    nextCalled = false;
    mockNext = () => {
      nextCalled = true;
    };
  });

  afterEach(() => {
    // Restore original env vars
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
    
    if (originalBypassFlag !== undefined) {
      process.env.LANTERN_TEST_AUTH_BYPASS = originalBypassFlag;
    } else {
      delete process.env.LANTERN_TEST_AUTH_BYPASS;
    }
    
    if (originalTestUserId !== undefined) {
      process.env.LANTERN_TEST_USER_ID = originalTestUserId;
    } else {
      delete process.env.LANTERN_TEST_USER_ID;
    }
  });

  it("should NOT inject user when NODE_ENV is not 'test'", () => {
    process.env.NODE_ENV = "production";
    process.env.LANTERN_TEST_AUTH_BYPASS = "true";
    mockReq.headers = { "x-lantern-test-auth": "true" };

    testAuthBypass(mockReq as Request, mockRes as Response, mockNext);

    expect(nextCalled).toBe(true);
    expect((mockReq as any).user).toBeUndefined();
  });

  it("should NOT inject user when NODE_ENV is 'development'", () => {
    process.env.NODE_ENV = "development";
    process.env.LANTERN_TEST_AUTH_BYPASS = "true";
    mockReq.headers = { "x-lantern-test-auth": "true" };

    testAuthBypass(mockReq as Request, mockRes as Response, mockNext);

    expect(nextCalled).toBe(true);
    expect((mockReq as any).user).toBeUndefined();
  });

  it("should NOT inject user when LANTERN_TEST_AUTH_BYPASS is not 'true'", () => {
    process.env.NODE_ENV = "test";
    process.env.LANTERN_TEST_AUTH_BYPASS = "false";
    mockReq.headers = { "x-lantern-test-auth": "true" };

    testAuthBypass(mockReq as Request, mockRes as Response, mockNext);

    expect(nextCalled).toBe(true);
    expect((mockReq as any).user).toBeUndefined();
  });

  it("should NOT inject user when LANTERN_TEST_AUTH_BYPASS is undefined", () => {
    process.env.NODE_ENV = "test";
    delete process.env.LANTERN_TEST_AUTH_BYPASS;
    mockReq.headers = { "x-lantern-test-auth": "true" };

    testAuthBypass(mockReq as Request, mockRes as Response, mockNext);

    expect(nextCalled).toBe(true);
    expect((mockReq as any).user).toBeUndefined();
  });

  it("should NOT inject user when x-lantern-test-auth header is missing", () => {
    process.env.NODE_ENV = "test";
    process.env.LANTERN_TEST_AUTH_BYPASS = "true";
    mockReq.headers = {}; // No header

    testAuthBypass(mockReq as Request, mockRes as Response, mockNext);

    expect(nextCalled).toBe(true);
    expect((mockReq as any).user).toBeUndefined();
  });

  it("should NOT inject user when x-lantern-test-auth header is not 'true'", () => {
    process.env.NODE_ENV = "test";
    process.env.LANTERN_TEST_AUTH_BYPASS = "true";
    mockReq.headers = { "x-lantern-test-auth": "false" };

    testAuthBypass(mockReq as Request, mockRes as Response, mockNext);

    expect(nextCalled).toBe(true);
    expect((mockReq as any).user).toBeUndefined();
  });

  it("should inject user when both NODE_ENV=test AND LANTERN_TEST_AUTH_BYPASS=true AND header is set", () => {
    process.env.NODE_ENV = "test";
    process.env.LANTERN_TEST_AUTH_BYPASS = "true";
    process.env.LANTERN_TEST_USER_ID = "test-user-123";
    mockReq.headers = { "x-lantern-test-auth": "true" };

    testAuthBypass(mockReq as Request, mockRes as Response, mockNext);

    expect(nextCalled).toBe(true);
    expect((mockReq as any).user).toBeDefined();
    expect((mockReq as any).user.id).toBe("test-user-123");
    expect((mockReq as any).user.username).toBe("test-bypass-user");
  });

  it("should use default user ID when LANTERN_TEST_USER_ID is not set", () => {
    process.env.NODE_ENV = "test";
    process.env.LANTERN_TEST_AUTH_BYPASS = "true";
    delete process.env.LANTERN_TEST_USER_ID;
    mockReq.headers = { "x-lantern-test-auth": "true" };

    testAuthBypass(mockReq as Request, mockRes as Response, mockNext);

    expect(nextCalled).toBe(true);
    expect((mockReq as any).user).toBeDefined();
    expect((mockReq as any).user.id).toBe("test-user");
    expect((mockReq as any).user.username).toBe("test-bypass-user");
  });

  it("should always call next()", () => {
    // Test with bypass disabled (no header)
    process.env.NODE_ENV = "production";
    process.env.LANTERN_TEST_AUTH_BYPASS = "false";
    mockReq.headers = {};

    testAuthBypass(mockReq as Request, mockRes as Response, mockNext);
    expect(nextCalled).toBe(true);

    // Reset
    nextCalled = false;
    mockReq = { headers: { "x-lantern-test-auth": "true" } };

    // Test with bypass enabled
    process.env.NODE_ENV = "test";
    process.env.LANTERN_TEST_AUTH_BYPASS = "true";

    testAuthBypass(mockReq as Request, mockRes as Response, mockNext);
    expect(nextCalled).toBe(true);
  });
});
