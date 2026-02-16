# Lantern Operator Guide

**Version**: A- Track (Deployable Platform)  
**Audience**: System administrators, compliance officers, legal operators  
**Purpose**: Court/compliance-ready operational procedures

## Table of Contents

1. [System Overview](#system-overview)
2. [Threat Model](#threat-model)
3. [Chain-of-Custody Explanation](#chain-of-custody-explanation)
4. [Export/Import Operations](#exportimport-operations)
5. [Retention & No-Delete Policy](#retention--no-delete-policy)
6. [Audit Verification Procedure](#audit-verification-procedure)
7. [Security Boundaries](#security-boundaries)
8. [Operational Procedures](#operational-procedures)

---

## System Overview

### What Lantern Does

Lantern is an **interpretive inspection framework** for fixed evidence artifacts. It:
- ✅ Stores evidence with cryptographic integrity guarantees
- ✅ Tracks every operation in an append-only ledger
- ✅ Provides tamper-evident audit trails
- ✅ Exports verifiable evidence packages
- ✅ Separates facts (immutable) from analysis (transparent)

### What Lantern Does NOT Do

- ❌ Does not assert truth, intent, or legitimacy
- ❌ Does not make AI-generated inferences
- ❌ Does not render verdicts or recommendations
- ❌ Does not hallucinate or extrapolate beyond evidence
- ❌ Does not allow evidence deletion (append-only)

### Core Boundary Principle

**"Evidence-bound posture"**: All analytical outputs:
- Are explicitly formula-transparent
- Link back to source evidence
- Show how conclusions were derived
- Distinguish system-derived from user-asserted claims

---

## Threat Model

### What Lantern Detects

1. **Evidence Tampering**
   - File modification after ingestion
   - Hash mismatches in verification
   - Broken chain-of-custody links

2. **Unauthorized Changes**
   - Claim modifications without ledger entry
   - Source substitution
   - Manifest corruption

3. **Integrity Violations**
   - Missing authentication tags
   - Decryption failures
   - Hash collisions

### What Lantern Does NOT Detect

1. **Pre-Ingestion Tampering**
   - Files modified before upload
   - Forged documents uploaded as authentic
   - Deep fakes or synthetic media (no authenticity validation)

2. **System-Level Attacks**
   - Database direct manipulation (requires access controls)
   - Encryption key theft
   - Physical server compromise

3. **Semantic Manipulation**
   - Misleading interpretations
   - Selective evidence presentation
   - Context removal

### Trust Assumptions

Lantern assumes:
- ✅ Encryption keys remain confidential
- ✅ Database has proper access controls
- ✅ Server operating system is secure
- ✅ Network traffic uses TLS/HTTPS
- ⚠️ **Does NOT assume**: Evidence authenticity at ingestion

### Operator Responsibilities

Operators must:
1. Verify evidence provenance before ingestion
2. Protect encryption keys (secure key management)
3. Maintain audit logs (ledger backups)
4. Control access (RBAC enforcement)
5. Perform periodic integrity verification

---

## Chain-of-Custody Explanation

### Legal Foundation

Chain-of-custody establishes:
- **What** evidence exists (files, claims)
- **When** it was collected (timestamps)
- **Who** handled it (user attribution)
- **How** it was stored (encryption, hashing)
- **Whether** it was modified (integrity checks)

### Technical Implementation

**1. Source Documents**

Each ingested file receives:
```
{
  source_id: UUID,
  filename: string,
  sha256: hex (computed on raw bytes),
  byte_length: number,
  ingested_at: ISO8601 timestamp,
  encrypted_blob: {
    iv: base64 (96-bit nonce),
    ciphertext: base64 (AES-256-GCM + auth tag),
    algorithm: "aes-256-gcm"
  }
}
```

**Hash is computed BEFORE encryption** on raw bytes to ensure verification is possible without decryption keys (for third-party audits).

**2. Claims (Extracted Assertions)**

Each claim references source evidence:
```
{
  claim_id: UUID,
  source_id: UUID (foreign key),
  start_offset: number (byte position),
  end_offset: number,
  sha256_fragment: hex (hash of extracted text),
  assertion_type: "system-derived" | "user-asserted",
  user_override_at?: ISO8601,
  user_id?: UUID
}
```

**Assertion types:**
- `system-derived`: Auto-extracted by heuristics/parsers
- `user-asserted`: User override (logged with timestamp + user ID)

**3. Append-Only Ledger**

All operations are logged:
```
{
  seq: monotonic integer,
  prev_hash: hex (hash of previous event),
  event_type: string (SOURCE_UPLOADED | CLAIM_CREATED | ...),
  payload_c14n: canonical JSON,
  hash: hex (SHA-256 of this event),
  actor_id: UUID,
  timestamp: ISO8601
}
```

**Ledger properties:**
- **Append-only**: No delete operations
- **Chained**: Each event links to previous hash
- **Tamper-evident**: Any modification breaks hash chain
- **Auditable**: Complete history reconstruction

**4. Manifest (Immutable Snapshot)**

When case is finalized:
```
{
  manifest_version: "1.0",
  case_id: UUID,
  created_at: ISO8601,
  created_by: UUID,
  sources: [ChainOfCustodySource],
  claims: [ChainOfCustodyClaim],
  evidence_pack_hash: hex (deterministic hash of all sources + claims),
  report_hash?: hex (optional markdown report hash),
  previous_manifest_hash?: hex (for manifest chaining)
}
```

**Evidence pack hash** is computed deterministically:
1. Canonical JSON serialization (sorted keys, stable formatting)
2. SHA-256 hash of serialized manifest
3. Stored in manifest for verification

### Verification Process

**Step-by-step integrity check:**

1. **Retrieve manifest** from database
2. **Recompute source hashes**:
   - Decrypt each source file
   - Compute SHA-256 of raw bytes
   - Compare to manifest hash
3. **Recompute claim hashes**:
   - Extract fragment at specified offsets
   - Compute SHA-256 of extracted text
   - Compare to manifest hash
4. **Recompute evidence pack hash**:
   - Serialize sources + claims canonically
   - Compute SHA-256
   - Compare to manifest hash
5. **Verify ledger chain**:
   - Recompute each event hash
   - Verify prev_hash linkage
   - Detect any broken links

**Verification outcomes:**
- ✅ **Valid**: All hashes match, chain intact
- ⚠️ **Mismatch**: Hash discrepancy detected (tampering)
- ❌ **Broken**: Chain broken, ledger corrupted
- 🔶 **Partial**: Some sources verifiable, others missing

---

## Export/Import Operations

### Export Evidence Package

**Purpose**: Create portable, verifiable case bundle for:
- Court submission
- Third-party audit
- Long-term archival
- Cross-system transfer

**Export bundle structure:**

```
evidence-package-{case_id}-{timestamp}.zip
├── manifest.json          # Chain-of-custody manifest
├── sources/
│   ├── {source_id}.enc    # Encrypted source files
│   └── {source_id}.meta   # Source metadata
├── claims.json            # All extracted claims
├── events.jsonl           # Ledger events (JSON Lines)
├── report.md              # Optional case report
└── hashes.json            # Quick integrity reference
```

**Export procedure:**

```bash
# API endpoint
GET /api/case/:caseId/export

# Returns: application/zip
```

**Options:**
- `include_plaintext=true`: Include decrypted sources (requires authorization)
- `include_report=true`: Include generated markdown report
- `verify_before_export=true`: Run integrity check before export

**Export guarantees:**
- ✅ All sources included with SHA-256 hashes
- ✅ All claims with fragment hashes
- ✅ Complete ledger history
- ✅ Manifest with evidence pack hash
- ✅ Self-contained (can be verified offline)

### Import Evidence Package

**Purpose**: Restore case from exported bundle, verify integrity

**Import procedure:**

```bash
# API endpoint
POST /api/case/import
Content-Type: multipart/form-data

# Body: exported .zip file
```

**Import process:**

1. **Extract bundle** to temporary directory
2. **Validate manifest**:
   - Check version compatibility
   - Verify JSON schema
   - Parse all fields
3. **Recompute hashes**:
   - Hash all source files
   - Compare to manifest
4. **Import to database**:
   - Create new case (new UUID)
   - Store sources (encrypted)
   - Create claims
   - Replay ledger events
5. **Verify integrity**:
   - Run full verification
   - Flag any mismatches
6. **Return status**:
   - ✅ Valid: All hashes match
   - ⚠️ Warning: Some issues detected
   - ❌ Failed: Critical integrity failure

**Import guarantees:**
- ✅ Idempotent (same input → same result)
- ✅ Atomic (all-or-nothing import)
- ✅ Verifiable (integrity checked on import)
- ✅ Auditable (import logged in new ledger)

**Integrity status:**
- `valid`: All hashes match, ready for use
- `broken`: Critical hash mismatch, manual review required
- `partial`: Some sources verifiable, others missing/corrupted

---

## Retention & No-Delete Policy

### Policy Overview

**Lantern enforces append-only forensics:**
- ✅ All evidence is retained permanently
- ✅ All operations are logged (no deletion)
- ✅ All changes are tracked in ledger
- ❌ No DELETE endpoints for evidence or claims
- ⚠️ Soft archive only (cases can be sealed)

### Rationale

**Legal requirements:**
1. Evidence preservation for appeals
2. Audit trail for chain-of-custody
3. Discovery compliance (no spoliation)
4. Long-term retention (years/decades)

**Technical enforcement:**
- Database schema has no DELETE operations on evidence tables
- Ledger events cannot be removed (append-only)
- API has no delete endpoints for sources/claims
- Soft delete via status flags (`archived`, `sealed`)

### Case Lifecycle

**States:**
1. **Active**: Case is being investigated
2. **Sealed**: Case finalized, evidence locked
3. **Archived**: Case moved to long-term storage (still queryable)

**State transitions:**
```
Active → Sealed (finalize case)
Sealed → Archived (move to cold storage)
```

**Operations by state:**
| Operation | Active | Sealed | Archived |
|-----------|--------|--------|----------|
| Add source | ✅ Yes | ❌ No | ❌ No |
| Add claim | ✅ Yes | ❌ No | ❌ No |
| View evidence | ✅ Yes | ✅ Yes | ✅ Yes |
| Verify integrity | ✅ Yes | ✅ Yes | ✅ Yes |
| Export package | ✅ Yes | ✅ Yes | ✅ Yes |

### Compliance Notes

**Retention periods:**
- Criminal cases: Varies by jurisdiction (often decades)
- Civil litigation: Typically 7+ years post-resolution
- Regulatory: Depends on industry (SEC: 7 years, HIPAA: 6 years)

**Operator responsibilities:**
1. Set retention policies per case type
2. Schedule periodic exports for backup
3. Monitor storage capacity
4. Plan for long-term archival
5. Document retention schedule

**Archival strategy:**
- Export packages to cold storage (S3 Glacier, tape backup)
- Maintain manifest/hash references in database
- Verify integrity on retrieval
- Keep encryption keys in secure vault

---

## Audit Verification Procedure

### Pre-Verification Checklist

Before running verification:
- [ ] Case is in stable state (no active uploads)
- [ ] Database backups are current
- [ ] Encryption keys are available
- [ ] Sufficient time allocated (large cases = minutes)

### Verification Command

**API endpoint:**
```bash
GET /api/case/:caseId/verify

# Returns:
{
  "status": "valid" | "mismatch" | "broken" | "partial",
  "evidence_pack_hash_match": boolean,
  "sources_verified": number,
  "sources_failed": number,
  "claims_verified": number,
  "claims_failed": number,
  "ledger_integrity": "valid" | "broken",
  "details": {
    "failed_sources": [{ source_id, expected_hash, actual_hash }],
    "failed_claims": [{ claim_id, expected_hash, actual_hash }],
    "broken_ledger_events": [{ seq, expected_prev_hash, actual_prev_hash }]
  }
}
```

### Verification Algorithm

**1. Manifest Retrieval**
```
- Fetch latest manifest from chain_of_custody_manifests table
- Parse JSON structure
- Validate schema
```

**2. Source Verification**
```
For each source in manifest:
  - Retrieve encrypted blob from enhanced_sources table
  - Decrypt using LANTERN_VAULT_KEY
  - Compute SHA-256 of decrypted bytes
  - Compare to manifest.sources[i].sha256
  - Record match/mismatch
```

**3. Claim Verification**
```
For each claim in manifest:
  - Retrieve source document
  - Extract fragment at [start_offset:end_offset]
  - Compute SHA-256 of fragment
  - Compare to manifest.claims[i].sha256_fragment
  - Record match/mismatch
```

**4. Evidence Pack Hash Verification**
```
- Serialize manifest.sources + manifest.claims canonically
- Compute SHA-256 of canonical JSON
- Compare to manifest.evidence_pack_hash
- Record match/mismatch
```

**5. Ledger Chain Verification**
```
- Retrieve all ledger_events ordered by seq
- For each event:
  - Recompute hash: SHA-256(canonical_json(event))
  - Verify hash matches event.hash
  - Verify prev_hash matches previous event's hash
  - Record any broken links
```

### Interpreting Results

**✅ Status: Valid**
- All source hashes match
- All claim hashes match
- Evidence pack hash matches
- Ledger chain intact
- **Action**: Case ready for use/export

**⚠️ Status: Mismatch**
- One or more hash mismatches detected
- Specific sources/claims identified
- Possible causes:
  - Source file corrupted
  - Database corruption
  - Encryption key mismatch
  - Tampering attempt
- **Action**: Investigate failed items, check backups

**❌ Status: Broken**
- Critical integrity failure
- Ledger chain broken
- Multiple hash failures
- **Action**: Restore from backup, incident response

**🔶 Status: Partial**
- Some sources missing from database
- Claims reference non-existent sources
- Incomplete case
- **Action**: Check for data loss, restore missing sources

### Periodic Verification Schedule

**Recommended frequency:**
- **Daily**: Automated verification of sealed cases
- **Weekly**: Full verification of active cases
- **Monthly**: Ledger chain verification
- **Before export**: Always verify before creating evidence package
- **After import**: Verify imported cases immediately

**Automation script:**
```bash
#!/bin/bash
# verify-all-cases.sh

# Get all case IDs
CASES=$(curl -s http://localhost:5000/api/cases | jq -r '.cases[].id')

# Verify each case
for CASE_ID in $CASES; do
  echo "Verifying case $CASE_ID..."
  RESULT=$(curl -s "http://localhost:5000/api/case/$CASE_ID/verify")
  STATUS=$(echo $RESULT | jq -r '.status')
  
  if [ "$STATUS" != "valid" ]; then
    echo "❌ ALERT: Case $CASE_ID verification failed: $STATUS"
    echo $RESULT | jq '.' > "failed-verification-$CASE_ID-$(date +%Y%m%d).json"
  else
    echo "✅ Case $CASE_ID verified successfully"
  fi
done
```

---

## Security Boundaries

### Immutable Guarantees

**What Lantern guarantees as immutable:**

1. **Source file hashes** (SHA-256 of raw bytes)
2. **Claim fragment hashes** (SHA-256 of extracted text)
3. **Evidence pack hash** (deterministic manifest hash)
4. **Ledger event hashes** (append-only chain)
5. **Timestamps** (ISO8601, ledger-logged)

**Cryptographic strength:**
- SHA-256 (256-bit, collision-resistant)
- AES-256-GCM (authenticated encryption)
- Random IVs (96-bit, unique per operation)

### Analytical Boundaries

**What Lantern does NOT guarantee:**

1. **Heuristic accuracy**:
   - Regex patterns may miss or over-match
   - Entity extraction may deduplicate incorrectly
   - Confidence scores are estimates

2. **Interpretive conclusions**:
   - "Suspicious" tags are analytical, not factual
   - Relationship graphs are inferred, not proven
   - Timeline reconstructions may have gaps

3. **Pre-ingestion authenticity**:
   - File could be forged before upload
   - Metadata could be manipulated
   - Deep fakes are not detected

### User Responsibility Warnings

**Users must understand:**

⚠️ **Evidence boundaries:**
- Lantern verifies *what was stored*, not *whether it's authentic*
- Users must verify provenance before ingestion
- Chain-of-custody starts at upload, not creation

⚠️ **Analysis boundaries:**
- Heuristics are tools, not oracles
- System-derived claims require human review
- User-asserted overrides are logged but not validated

⚠️ **Export limitations:**
- Encrypted exports require key for decryption
- Third parties need key to verify sources
- Manifest is self-contained but may lack context

### Trust Boundary UI

**Required UI elements:**

1. **Case Dashboard:**
   - [ ] Immutable guarantees panel
   - [ ] Analytical boundaries panel
   - [ ] Verification status indicator
   - [ ] Export status (last export time)

2. **Heuristic Screens:**
   - [ ] "System-derived" disclaimer banner
   - [ ] Confidence score display
   - [ ] Link to source evidence
   - [ ] Override mechanism (logged)

3. **Claim Creation:**
   - [ ] Assertion type selector (system/user)
   - [ ] Source reference required
   - [ ] Fragment preview
   - [ ] Ledger notification

---

## Operational Procedures

### Daily Operations

**Morning checklist:**
1. Check system health (`/api/__health`)
2. Review overnight verification results
3. Check disk space (database + uploads)
4. Review access logs for anomalies

**During case work:**
1. Upload sources with provenance notes
2. Review system-derived claims
3. Assert user overrides (with justification)
4. Export work-in-progress periodically

**End-of-day:**
1. Run verification on modified cases
2. Export updated cases to backup
3. Review ledger for unexpected events

### Weekly Operations

**Case maintenance:**
1. Verify all active cases
2. Seal completed cases (finalize manifest)
3. Archive old sealed cases
4. Rotate access logs

**System maintenance:**
1. Database backup (pg_dump)
2. Upload volume backup
3. Check encryption key accessibility
4. Review RBAC permissions

### Monthly Operations

**Compliance review:**
1. Full ledger verification (all cases)
2. Retention policy compliance check
3. Access audit (who accessed what)
4. Security patch review

**Performance:**
1. Database vacuum/analyze
2. Disk usage trends
3. Query performance review
4. Capacity planning

### Incident Response

**Evidence tampering detected:**

1. **Immediate actions:**
   - Isolate affected case
   - Preserve current state (export + backup)
   - Review ledger for anomalous events
   - Check access logs

2. **Investigation:**
   - Identify failed hashes
   - Compare to last known good backup
   - Determine scope (single source vs. systemic)
   - Document findings

3. **Resolution:**
   - Restore from backup if available
   - Flag case as "under review"
   - Notify stakeholders
   - Update incident log

4. **Post-incident:**
   - Root cause analysis
   - Update security controls
   - Revise procedures
   - Train operators

### Access Control

**Role-based permissions:**

| Role | Permissions |
|------|-------------|
| Lead Investigator | Read, Write, Verify, Export |
| Reviewer | Read, Comment (no evidence edit) |
| Auditor | Read, Verify, Export (no edit) |

**Best practices:**
- Principle of least privilege
- Regular permission audits
- User activity logging
- Session timeouts

### Backup Strategy

**3-2-1 rule:**
- **3** copies of data
- **2** different storage media
- **1** offsite copy

**Backup schedule:**
- Database: Daily (incremental), Weekly (full)
- Uploads: Daily (rsync/backup)
- Encryption keys: Secure vault (not with backups)

**Verification:**
- Test restore monthly
- Verify backup integrity (checksums)
- Document restore procedures

---

## Appendix

### API Endpoints Reference

See [API_REFERENCE.md](./API_REFERENCE.md) for complete API documentation.

### Glossary

- **Chain-of-Custody**: Documented chronological history of evidence handling
- **Evidence Pack**: Collection of sources + claims with integrity hashes
- **Manifest**: Immutable snapshot of case state at finalization
- **Ledger**: Append-only log of all case operations
- **System-Derived**: Claims auto-extracted by heuristics
- **User-Asserted**: Claims manually created/overridden by user
- **Fail-Closed**: Security posture that rejects operations on error

### References

- [NIST SP 800-86](https://csrc.nist.gov/publications/detail/sp/800-86/final): Guide to Integrating Forensic Techniques into Incident Response
- [ISO 27037:2012](https://www.iso.org/standard/44381.html): Guidelines for identification, collection, acquisition, and preservation of digital evidence
- [Federal Rules of Evidence](https://www.uscourts.gov/rules-policies/current-rules-practice-procedure/federal-rules-evidence): Rules 901-902 (Authentication and Identification)

### Support

For operational questions:
- GitHub Issues: https://github.com/Swixixle/Lantern/issues
- Documentation: `/docs` directory
