# Lantern API Reference

**Version**: A- Track (Deployable Platform)  
**Base URL**: `http://localhost:5000/api`  
**Authentication**: Required for most endpoints (RBAC enforced)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Case Management](#case-management)
3. [Source Management](#source-management)
4. [Chain-of-Custody](#chain-of-custody)
5. [Verification](#verification)
6. [Export/Import](#exportimport)
7. [Claims](#claims)
8. [Error Responses](#error-responses)

---

## Authentication

### Check Auth Status

```http
GET /api/auth/status
```

**Response:**
```json
{
  "authenticated": true,
  "user": {
    "id": "user-uuid",
    "username": "investigator",
    "role": "lead_investigator"
  }
}
```

---

## Case Management

### Create Case

```http
POST /api/cases
Content-Type: application/json

{
  "title": "Case Title",
  "description": "Case description",
  "decision_target": "2026-03-01T00:00:00Z"
}
```

**Response:**
```json
{
  "id": "case-uuid",
  "title": "Case Title",
  "status": "active",
  "created_at": "2026-02-16T00:00:00Z"
}
```

### List Cases

```http
GET /api/cases?status=active&page=1&perPage=20
```

**Query Parameters:**
- `status`: Filter by status (active, sealed, archived)
- `page`: Page number (default: 1)
- `perPage`: Results per page (default: 20, max: 100)

**Response:**
```json
{
  "cases": [
    {
      "id": "case-uuid",
      "title": "Case Title",
      "status": "active",
      "created_at": "2026-02-16T00:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "perPage": 20
}
```

### Get Case Details

```http
GET /api/cases/:caseId
```

**Response:**
```json
{
  "id": "case-uuid",
  "title": "Case Title",
  "description": "...",
  "status": "active",
  "decision_target": "2026-03-01T00:00:00Z",
  "created_at": "2026-02-16T00:00:00Z",
  "updated_at": "2026-02-16T05:00:00Z"
}
```

### Update Case

```http
PATCH /api/cases/:caseId
Content-Type: application/json

{
  "status": "sealed",
  "description": "Updated description"
}
```

**Permissions:** WRITE (Lead Investigator only)

---

## Source Management

### Upload Source (Chunked)

**Step 1: Initialize Upload**

```http
POST /api/cases/:caseId/uploads/init
Content-Type: application/json

{
  "filename": "evidence.pdf",
  "mimeType": "application/pdf",
  "fileSize": 1048576
}
```

**Response:**
```json
{
  "upload_id": "upload-uuid",
  "chunk_size": 1048576
}
```

**Step 2: Upload Chunks**

```http
PUT /api/cases/:caseId/uploads/:uploadId/data
Content-Type: application/octet-stream

<binary data>
```

**Step 3: Complete Upload**

```http
POST /api/cases/:caseId/uploads/complete
Content-Type: application/json

{
  "upload_id": "upload-uuid",
  "sha256": "computed-hash"
}
```

**Response:**
```json
{
  "source_id": "source-uuid",
  "filename": "evidence.pdf",
  "sha256_raw": "sha256-hex",
  "byte_length": 1048576,
  "uploaded_at": "2026-02-16T00:00:00Z"
}
```

### List Sources

```http
GET /api/cases/:caseId/uploads
```

**Response:**
```json
{
  "sources": [
    {
      "id": "source-uuid",
      "filename": "evidence.pdf",
      "sha256_raw": "sha256-hex",
      "byte_length": 1048576,
      "ingestion_state": "ready",
      "uploaded_at": "2026-02-16T00:00:00Z"
    }
  ]
}
```

---

## Chain-of-Custody

### Get Manifest

Retrieve current chain-of-custody manifest.

```http
GET /api/case/:caseId/manifest
```

**Permissions:** READ

**Response:**
```json
{
  "manifest": {
    "manifest_version": "1.0",
    "case_id": "case-uuid",
    "created_at": "2026-02-16T00:00:00Z",
    "created_by": "user-uuid",
    "sources": [
      {
        "source_id": "source-uuid",
        "filename": "evidence.pdf",
        "sha256": "sha256-hex",
        "byte_length": 1048576,
        "ingested_at": "2026-02-16T00:00:00Z"
      }
    ],
    "claims": [
      {
        "claim_id": "claim-uuid",
        "source_id": "source-uuid",
        "start_offset": 100,
        "end_offset": 200,
        "sha256_fragment": "sha256-hex",
        "assertion_type": "system-derived"
      }
    ],
    "evidence_pack_hash": "sha256-hex",
    "report_hash": "sha256-hex"
  },
  "manifest_id": "manifest-uuid",
  "created_at": "2026-02-16T00:00:00Z"
}
```

### Finalize Case

Create immutable manifest for case.

```http
POST /api/case/:caseId/finalize
Content-Type: application/json

{
  "created_by": "user-uuid",
  "report_hash": "sha256-hex"
}
```

**Permissions:** WRITE (Lead Investigator)

**Response:**
```json
{
  "success": true,
  "manifest_id": "manifest-uuid",
  "manifest": { /* manifest object */ }
}
```

---

## Verification

### Verify Case Integrity

Verify integrity of case evidence pack by recomputing all hashes.

```http
GET /api/case/:caseId/verify
```

**Permissions:** VERIFY (Auditor or Lead Investigator)

**Response:**
```json
{
  "status": "valid",
  "evidence_pack_hash_match": true,
  "sources_verified": 5,
  "sources_failed": 0,
  "claims_verified": 23,
  "claims_failed": 0,
  "ledger_integrity": "valid",
  "verification_timestamp": "2026-02-16T05:30:00Z",
  "details": {
    "failed_sources": [],
    "failed_claims": [],
    "broken_ledger_events": []
  }
}
```

**Status Values:**
- `valid`: All checks passed
- `mismatch`: Hash discrepancies detected
- `broken`: Ledger chain broken
- `partial`: Some sources missing

---

## Export/Import

### Export Evidence Package

Export complete evidence package as ZIP bundle.

```http
GET /api/case/:caseId/export?include_plaintext=true&verify_before_export=true
```

**Query Parameters:**
- `include_plaintext`: Include decrypted sources (default: false)
- `include_report`: Include generated report (default: false)
- `verify_before_export`: Run integrity check before export (default: false)

**Permissions:** READ

**Response:** `application/zip` file

**Bundle Contents:**
- `manifest.json` - Chain-of-custody manifest
- `sources/{source_id}/` - Source files and metadata
- `claims.json` - All extracted claims
- `events.jsonl` - Complete ledger history (JSON Lines format)
- `hashes.json` - Quick integrity reference
- `report.md` - Optional case report
- `README.md` - Bundle documentation

### Import Evidence Package

Import evidence package from exported ZIP bundle.

```http
POST /api/case/import
Content-Type: multipart/form-data

bundle: <file>
```

**Permissions:** WRITE (Lead Investigator)

**Response:**
```json
{
  "success": true,
  "case_id": "new-case-uuid",
  "verification": {
    "status": "valid",
    "sources_imported": 5,
    "claims_imported": 23
  }
}
```

**Note:** Import functionality is currently a placeholder. See implementation roadmap in response.

---

## Claims

### Create Claim

Create a new claim with assertion type tracking.

```http
POST /api/case/:caseId/claim
Content-Type: application/json

{
  "source_id": "source-uuid",
  "start_offset": 100,
  "end_offset": 200,
  "fragment_text": "extracted text",
  "assertion_type": "user-asserted",
  "confidence": 0.95,
  "claim_text": "This is a key piece of evidence",
  "justification": "Manual review confirmed this passage is critical"
}
```

**Permissions:** WRITE (Lead Investigator)

**Request Fields:**
- `source_id`: UUID of source document
- `start_offset`: Character offset where fragment begins
- `end_offset`: Character offset where fragment ends
- `fragment_text`: Extracted text for hashing
- `assertion_type`: `"system-derived"` or `"user-asserted"`
- `confidence`: Optional confidence score (0.0 - 1.0)
- `claim_text`: Optional interpretation
- `justification`: Optional reasoning for user-asserted claims

**Response:**
```json
{
  "success": true,
  "claim": {
    "id": "claim-uuid",
    "source_id": "source-uuid",
    "start_offset": 100,
    "end_offset": 200,
    "sha256_fragment": "sha256-hex",
    "assertion_type": "user-asserted",
    "user_override_at": "2026-02-16T05:30:00Z",
    "user_id": "user-uuid",
    "confidence": 0.95
  }
}
```

---

## Error Responses

### Standard Error Format

All errors follow this structure:

```json
{
  "error": "Human-readable error message",
  "details": "Additional technical details",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

**400 Bad Request:**
```json
{
  "error": "Invalid request",
  "details": "Missing required field: filename"
}
```

**401 Unauthorized:**
```json
{
  "error": "Authentication required",
  "details": "No valid session found"
}
```

**403 Forbidden:**
```json
{
  "error": "Insufficient permissions",
  "details": "WRITE permission required for this operation"
}
```

**404 Not Found:**
```json
{
  "error": "Resource not found",
  "details": "Case case-uuid not found"
}
```

**409 Conflict:**
```json
{
  "error": "Case integrity check failed",
  "verification": {
    "status": "mismatch",
    "sources_failed": 2
  }
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "details": "Decryption failed: authentication tag mismatch"
}
```

**501 Not Implemented:**
```json
{
  "error": "Import functionality not yet implemented",
  "message": "This endpoint will be implemented in the next phase",
  "required_steps": ["..."]
}
```

---

## Rate Limiting

Currently no rate limiting is enforced. For production deployments, consider implementing:
- Per-user rate limits (e.g., 100 requests/minute)
- Per-IP rate limits for unauthenticated endpoints
- Special limits for resource-intensive operations (export, verification)

---

## Versioning

API version: **v1** (implicit in URL structure)

Breaking changes will be introduced in new API versions (e.g., `/api/v2/`).

---

## RBAC Permissions

### Roles

| Role | Permissions | Description |
|------|-------------|-------------|
| **Lead Investigator** | READ, WRITE, VERIFY, EXPORT | Full access to cases |
| **Reviewer** | READ, COMMENT | Review evidence, cannot modify |
| **Auditor** | READ, VERIFY, EXPORT | Integrity verification only |

### Permission Requirements by Endpoint

| Endpoint | Permission | Notes |
|----------|------------|-------|
| `GET /api/cases` | READ | List cases user has access to |
| `POST /api/cases` | WRITE | Create new case |
| `POST /api/case/:id/finalize` | WRITE | Seal case |
| `POST /api/case/:id/claim` | WRITE | Create claim |
| `GET /api/case/:id/verify` | VERIFY | Run integrity check |
| `GET /api/case/:id/export` | READ | Export evidence package |
| `POST /api/case/import` | WRITE | Import evidence package |

---

## Webhooks (Future)

Planned webhook support for:
- Case finalized
- Verification failed
- Export completed
- Integrity check scheduled

---

## GraphQL API (Future)

A GraphQL endpoint is planned for:
- Complex querying across cases
- Real-time subscriptions
- Efficient nested data fetching

---

## Client Libraries

Official client libraries planned for:
- JavaScript/TypeScript (Node.js and Browser)
- Python
- Go
- Java

---

## Support

- **Documentation**: `/docs` directory
- **Issues**: https://github.com/Swixixle/Lantern/issues
- **API Changes**: See `CHANGELOG.md` for version history

---

## Legal Notice

This API is part of Lantern, an evidence management system with legal-grade chain-of-custody.

**Important:**
- Chain-of-custody begins at ingestion (upload)
- Lantern cannot verify pre-ingestion authenticity
- Operators must maintain external custody documentation
- Consult legal counsel for jurisdiction-specific requirements

For legal considerations, see [docs/OPERATOR_GUIDE.md](./OPERATOR_GUIDE.md).
