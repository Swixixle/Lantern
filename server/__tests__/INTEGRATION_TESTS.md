# HTTP+DB Integration Tests

## Purpose

These tests prove the legal hardening capabilities of Lantern by testing the complete chain-of-custody workflow via HTTP endpoints with a real PostgreSQL database.

## What is Proven

### 1. **Valid Chain-of-Custody Workflow**
- ✅ Create case → upload source → create claim → finalize → verify
- ✅ End-to-end integrity verification via HTTP endpoints
- ✅ Manifest creation and storage in database

### 2. **Tamper Detection**
- ✅ Modifying stored manifest data triggers integrity mismatch
- ✅ Verification endpoint returns `status: "mismatch"`
- ✅ Computed hash differs from stored hash when tampered

### 3. **Encryption-at-Rest**
- ✅ File content is encrypted using AES-256-GCM before storage
- ✅ Ciphertext is NOT equal to plaintext
- ✅ Decryption roundtrip recovers original content
- ✅ Tampered ciphertext fails authentication

### 4. **Refusal Override Logging**
- ✅ User-asserted claims store `assertion_type: "user-asserted"` in DB
- ✅ User ID and override timestamp are persisted
- ✅ Ledger events created with `user_override_refusal_threshold` type
- ✅ Manifest preserves distinction between system-derived and user-asserted claims

## Requirements

- Docker and Docker Compose
- Node.js 18+
- PostgreSQL 16 (via Docker)

## Running Tests Locally

### Option 1: Automated (Recommended)

Run the full integration test suite with automatic DB setup and teardown:

```bash
npm run test:integration
```

This will:
1. Start PostgreSQL test container on port 5433
2. Apply database schema migrations
3. Run all HTTP+DB integration tests
4. Tear down the test container

### Option 2: Manual Control

For debugging or iterative testing:

```bash
# Start test database
npm run test:integration:setup

# Run tests (can run multiple times)
DATABASE_URL=postgresql://lantern_test:test_password@localhost:5433/lantern_test npm test -- server/__tests__/coc.http.integration.test.ts

# Stop test database when done
npm run test:integration:teardown
```

### Option 3: Existing PostgreSQL

If you have PostgreSQL running elsewhere:

```bash
# Set DATABASE_URL to your test database
export DATABASE_URL=postgresql://user:password@host:port/database

# Push schema
npm run db:push

# Run tests
npm test -- server/__tests__/coc.http.integration.test.ts
```

## Test Output

Successful test run should show:

```
✓ Flow 1: Valid Chain-of-Custody Workflow
  ✓ should complete full workflow: create case → upload source → create claim → finalize → verify

✓ Flow 2: Tamper Detection
  ✓ should detect tampering when manifest data is modified in DB

✓ Encryption-at-Rest Proof
  ✓ should store encrypted data (not plaintext) and decrypt correctly
  ✓ should fail decryption if tampered

✓ Refusal Override Logging Proof
  ✓ should store user-asserted claim with assertion_type and create ledger event
  ✓ should distinguish system-derived from user-asserted claims in manifest

Test Files  1 passed (1)
     Tests  6 passed (6)
```

## CI/CD Integration

For GitHub Actions or other CI systems:

```yaml
- name: Start PostgreSQL
  run: docker compose -f docker-compose.test.yml up -d

- name: Wait for DB
  run: sleep 5

- name: Setup database schema
  run: DATABASE_URL=postgresql://lantern_test:test_password@localhost:5433/lantern_test npm run db:push

- name: Run integration tests
  run: DATABASE_URL=postgresql://lantern_test:test_password@localhost:5433/lantern_test npm test -- server/__tests__/coc.http.integration.test.ts

- name: Teardown
  run: docker compose -f docker-compose.test.yml down
```

## Security Notes

- Test database uses temporary storage (tmpfs) for speed
- Test credentials are only for local development
- Integration tests clean up test data after execution
- Production encryption keys are never used in tests

## What These Tests Do NOT Cover

- Actual HTTP authentication/authorization (mocked in tests)
- File upload via multipart forms (tested separately)
- Network reliability or performance
- UI integration

For legal/compliance purposes, these HTTP+DB integration tests demonstrate:
- **Chain-of-custody integrity** is preserved end-to-end
- **Tamper detection** works at the database level
- **Encryption-at-rest** is correctly implemented
- **User override logging** creates auditable records
