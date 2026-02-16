# Chain-of-Custody System Documentation

## Overview

The Lantern Chain-of-Custody system provides cryptographic integrity verification and legal compliance tracking for evidence management. It implements a deterministic, auditable evidence handling workflow suitable for legal and forensic contexts.

## Core Features

### 1. Chain-of-Custody Manifests

Each case maintains a cryptographic manifest that records:
- Source documents with SHA-256 hashes
- Claims and their supporting evidence
- Ledger events tracking all modifications
- Integrity verification signatures

**Schema:** `ChainOfCustodyManifestV1`

```typescript
interface ChainOfCustodyManifestV1 {
  version: "1.0";
  case_id: string;
  created_at: string; // ISO 8601
  finalized: boolean;
  sources: ChainOfCustodySource[];
  claims: ChainOfCustodyClaim[];
  ledger_summary: LedgerSummary;
  integrity_signature: string; // SHA-256 of canonical manifest
}
```

### 2. Source Document Tracking

Each source document is tracked with:
- Original filename and upload timestamp
- SHA-256 hash of file contents
- Storage path (encrypted if configured)
- Role classification (PRIMARY, SUPPORTING, REBUTTAL)

### 3. Claim Tracking

Claims are categorized by assertion type:
- **SYSTEM_DERIVED**: Automatically extracted from documents
- **USER_ASSERTED**: Manually asserted by investigators
- **DISPUTED**: Marked as contested or ambiguous

Each claim includes:
- Supporting evidence anchor IDs
- Confidence score (if system-derived)
- User justification (if user-asserted)
- Evidence classification (DEFENSIBLE, RESTRICTED, AMBIGUOUS)

### 4. Encryption Support

Optional at-rest encryption using AES-256-GCM:
- File contents can be encrypted before storage
- Initialization vectors (IVs) stored alongside ciphertext
- Authentication tags ensure data integrity
- Key management via environment variable `ENCRYPTION_KEY`

## API Endpoints

### GET /api/case/:caseId/manifest

Retrieves the current chain-of-custody manifest for a case.

**Permissions:** READ

**Response:**
```json
{
  "manifest": { /* ChainOfCustodyManifestV1 */ },
  "manifest_id": "string",
  "created_at": "ISO 8601 timestamp"
}
```

### GET /api/case/:caseId/verify

Verifies the integrity of a case by recomputing all hashes and comparing to stored values.

**Permissions:** VERIFY (Auditor or Lead Investigator)

**Response:**
```json
{
  "valid": true,
  "verification_time": "ISO 8601 timestamp",
  "checks": {
    "manifest_signature": { "valid": true },
    "source_hashes": { "valid": true, "verified_count": 5 },
    "ledger_integrity": { "valid": true, "event_count": 42 }
  }
}
```

### POST /api/case/:caseId/finalize

Finalizes a manifest, marking it as complete and generating a final integrity report.

**Permissions:** FINALIZE (Lead Investigator only)

**Request Body:**
```json
{
  "finalized_by": "user-id",
  "report_path": "optional/path/to/report.pdf"
}
```

**Response:**
```json
{
  "manifest_id": "string",
  "finalized": true,
  "integrity_signature": "sha256-hex",
  "report_generated": true
}
```

### POST /api/case/:caseId/claim

Tracks a new claim with assertion type.

**Permissions:** WRITE

**Request Body:**
```json
{
  "claim_id": "string",
  "assertion_type": "USER_ASSERTED" | "SYSTEM_DERIVED" | "DISPUTED",
  "justification": "optional explanation for user assertions",
  "confidence_score": 0.85, // for system-derived only
  "anchor_ids": ["anchor-001", "anchor-002"]
}
```

### GET /api/case/:caseId/export

Exports the complete evidence pack as a deterministic ZIP bundle.

**Permissions:** EXPORT (Auditor or Lead Investigator)

**Query Parameters:**
- `include_sources`: boolean (default: false) - Include raw source files

**Response:** ZIP file download

## Role-Based Access Control (RBAC)

### Roles

1. **Viewer**: Read-only access to manifests
2. **Investigator**: Can read and write claims, sources
3. **Lead Investigator**: Can finalize manifests, export packs
4. **Auditor**: Can verify integrity and export packs
5. **Admin**: Full access including role management

### Permissions

- `READ`: View manifests and data
- `WRITE`: Create and modify claims/sources
- `VERIFY`: Run integrity checks
- `EXPORT`: Download evidence packs
- `FINALIZE`: Mark manifests as complete
- `ADMIN`: Manage users and roles

## Encryption Configuration

### Environment Variables

```bash
# Encryption key for at-rest data (32+ characters recommended)
ENCRYPTION_KEY=your-secure-key-here

# Alternative: use key derivation from passphrase
# The system will derive a 256-bit key from this passphrase
```

### Key Management Best Practices

1. **Production**: Use AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault
2. **Development**: Set a temporary key in `.env` (never commit)
3. **Rotation**: Plan key rotation strategy for long-term deployments
4. **Backup**: Ensure encrypted data is recoverable if key is lost

### Using Encryption

```typescript
import { encryptFile, decryptFile, getEncryptionKey } from "./lib/encryption";

// Encrypt a file before storage
const fileBuffer = await readFile("document.pdf");
const encrypted = encryptFile(fileBuffer);
await storage.saveEncryptedSource({
  iv: encrypted.iv,
  ciphertext: encrypted.ciphertext,
  algorithm: encrypted.algorithm
});

// Decrypt when retrieving
const storedData = await storage.getEncryptedSource(sourceId);
const decrypted = decryptFile(storedData);
```

## Security Considerations

### Integrity Verification

All manifests include cryptographic signatures computed from:
1. Canonical JSON serialization (stable key ordering)
2. SHA-256 hashing of serialized content
3. Inclusion of all source hashes and ledger events

**Important:** Any modification to sources, claims, or ledger invalidates the signature.

### Audit Trail

The ledger system records:
- All source uploads (with timestamps and hashes)
- Claim creation and modification
- Evidence pack exports
- Manifest finalization

Ledger events are immutable and cannot be deleted (append-only).

### Evidence Classification

Claims are classified to indicate their reliability:

- **DEFENSIBLE**: Strong evidence with multiple supporting anchors
- **RESTRICTED**: Sufficient for internal use, may need additional verification
- **AMBIGUOUS**: Weak or conflicting evidence, requires human review

### No-Delete Policy

By design, the system enforces:
- No deletion of source files after ingestion
- No deletion of ledger events
- No modification of finalized manifests
- Audit trail preservation for legal compliance

## Database Schema

### chain_of_custody_manifests

```sql
CREATE TABLE chain_of_custody_manifests (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  manifest_json TEXT NOT NULL, -- Full manifest as JSON
  integrity_signature TEXT NOT NULL,
  finalized BOOLEAN DEFAULT FALSE
);
```

### enhanced_sources

```sql
CREATE TABLE enhanced_sources (
  id TEXT PRIMARY KEY,
  corpus_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  sha256_hex TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  encrypted_blob TEXT, -- Base64-encoded encrypted data (optional)
  iv TEXT, -- Initialization vector for decryption
  encryption_algorithm TEXT DEFAULT 'aes-256-gcm'
);
```

### tracked_claims

```sql
CREATE TABLE tracked_claims (
  id TEXT PRIMARY KEY,
  corpus_id TEXT NOT NULL,
  claim_text TEXT NOT NULL,
  assertion_type TEXT NOT NULL, -- SYSTEM_DERIVED | USER_ASSERTED | DISPUTED
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id TEXT, -- For user-asserted claims
  justification TEXT, -- Optional explanation
  confidence_score REAL, -- For system-derived claims
  evidence_classification TEXT -- DEFENSIBLE | RESTRICTED | AMBIGUOUS
);
```

### user_roles

```sql
CREATE TABLE user_roles (
  user_id TEXT PRIMARY KEY,
  role TEXT NOT NULL, -- VIEWER | INVESTIGATOR | LEAD_INVESTIGATOR | AUDITOR | ADMIN
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by TEXT
);
```

## Usage Examples

### Creating a New Case with Chain of Custody

```typescript
// 1. Create case/corpus
const corpus = await storage.createCorpus({ purpose: "CLAIM_GOVERNANCE" });

// 2. Upload source with hash tracking
const pdfBuffer = await readFile("evidence.pdf");
const sha256 = createHash("sha256").update(pdfBuffer).digest("hex");
const source = await storage.createCorpusSource({
  corpusId: corpus.id,
  role: "PRIMARY",
  filename: "evidence.pdf",
  sha256Hex: sha256,
  storagePath: `/uploads/corpus/${corpus.id}/${sha256}-evidence.pdf`
});

// 3. Create ledger event
await storage.createLedgerEvent(
  corpus.id,
  "SOURCE_UPLOADED",
  "SOURCE",
  source.id,
  { source_id: source.id, filename: "evidence.pdf", sha256_hex: sha256 }
);

// 4. Generate manifest
const manifest = await createManifest(corpus.id);
console.log("Manifest created:", manifest.integrity_signature);
```

### Verifying Integrity

```typescript
// Fetch manifest
const manifests = await storage.db
  .select()
  .from(storage.schema.chainOfCustodyManifests)
  .where(eq(storage.schema.chainOfCustodyManifests.caseId, caseId));

const manifest = JSON.parse(manifests[0].manifestJson);

// Verify
const verification = await verifyManifestIntegrity(manifest);
if (!verification.valid) {
  console.error("Integrity check failed:", verification.errors);
}
```

## Troubleshooting

### Issue: Encryption key not found

**Solution:** Set `ENCRYPTION_KEY` environment variable:
```bash
export ENCRYPTION_KEY="your-secure-key-minimum-32-characters"
```

### Issue: Manifest signature mismatch

**Cause:** Source file modified after manifest creation.

**Solution:** Regenerate manifest or investigate unauthorized modifications.

### Issue: Decryption fails

**Causes:**
1. Wrong encryption key
2. Corrupted ciphertext
3. Tampered authentication tag

**Solution:** Verify `ENCRYPTION_KEY` matches original. If corrupted, restore from backup.

## Future Enhancements

Planned features:
- Multi-key encryption for shared access
- Hardware security module (HSM) integration
- Automated evidence pack distribution
- Blockchain anchoring for tamper evidence
- Time-stamping service integration

## Support

For issues or questions:
- Check logs: `server/index.log`
- Review ledger events for audit trail
- Contact system administrator for RBAC issues

## References

- [NIST SP 800-53 (Security Controls)](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- [Federal Rules of Evidence (Authenticity)](https://www.law.cornell.edu/rules/fre)
- [AES-GCM Specification (NIST)](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
