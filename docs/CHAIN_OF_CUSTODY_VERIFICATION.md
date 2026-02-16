# Chain-of-Custody Verification - Technical Reference

**Version**: A- Track (Deployable Platform)  
**Purpose**: Step-by-step verification procedures for evidence integrity  
**Audience**: Auditors, operators, legal teams, third-party verifiers

---

## Quick Reference

### Verify Case Integrity

```bash
curl -X GET "http://localhost:5000/api/case/{caseId}/verify"
```

### Export Evidence Package

```bash
curl -X GET "http://localhost:5000/api/case/{caseId}/export"
```

### Retrieve Manifest

```bash
curl -X GET "http://localhost:5000/api/case/{caseId}/manifest"
```

---

## Complete Verification Procedure

### Step 1: Retrieve Manifest

```bash
# Get the latest manifest for the case
CASE_ID="your-case-id"
curl -X GET "http://localhost:5000/api/case/$CASE_ID/manifest" > manifest.json

# Verify manifest structure
cat manifest.json | jq '.manifest'
```

**Expected structure:**
```json
{
  "manifest_version": "1.0",
  "case_id": "abc-123",
  "created_at": "2026-02-16T00:00:00Z",
  "created_by": "user-id",
  "sources": [...],
  "claims": [...],
  "evidence_pack_hash": "sha256-hex",
  "report_hash": "sha256-hex"
}
```

### Step 2: Run Automated Verification

```bash
# Run full integrity check
curl -X GET "http://localhost:5000/api/case/$CASE_ID/verify" | jq '.'
```

**Interpret results:**

- `status: "valid"` - All checks passed ✅
- `status: "mismatch"` - Hash discrepancies detected ⚠️
- `status: "broken"` - Ledger chain broken ❌
- `status: "partial"` - Some sources missing 🔶

### Step 3: Verify Ledger Chain

**Check ledger integrity:**

```bash
curl -X GET "http://localhost:5000/api/case/$CASE_ID/verify" | \
  jq '.ledger_integrity'
```

**Expected:** `"valid"`

**If broken:** Check `broken_ledger_events` array for sequence numbers with issues.

### Step 4: Export Evidence Package

```bash
# Export complete evidence bundle
curl -X GET "http://localhost:5000/api/case/$CASE_ID/export" \
  -o "evidence-$CASE_ID-$(date +%Y%m%d).json"
```

**Bundle includes:**
- Complete manifest
- Verification results
- Export timestamp
- Case metadata

---

## Verification Outcomes

### ✅ Valid

All integrity checks passed:
- ✓ All source hashes match
- ✓ All claim hashes match  
- ✓ Evidence pack hash matches
- ✓ Ledger chain intact

**Action:** Case ready for use/export/submission

### ⚠️ Mismatch

Hash discrepancies detected:

**Check:**
```bash
curl -X GET "http://localhost:5000/api/case/$CASE_ID/verify" | \
  jq '.details.failed_sources'
```

**Possible causes:**
1. File corruption (disk/network error)
2. Wrong encryption key (key rotation issue)
3. Tampering (unauthorized modification)

**Action:** Investigate specific failed items, restore from backup if needed

### ❌ Broken

Critical integrity failure:

**Check:**
```bash
curl -X GET "http://localhost:5000/api/case/$CASE_ID/verify" | \
  jq '.details.broken_ledger_events'
```

**Possible causes:**
1. Direct database manipulation
2. Clock skew (time travel)
3. Race conditions (concurrent writes)

**Action:** Restore from backup, flag case, incident response

### 🔶 Partial

Some sources missing:

**Check:**
```bash
curl -X GET "http://localhost:5000/api/case/$CASE_ID/verify" | \
  jq '.sources_verified, .sources_failed'
```

**Action:** Check for data loss, restore missing sources

---

## Automated Verification Script

Save as `verify-case.sh`:

```bash
#!/bin/bash
# Automated chain-of-custody verification

CASE_ID=$1
API_BASE="${API_BASE:-http://localhost:5000}"

if [ -z "$CASE_ID" ]; then
  echo "Usage: $0 <case-id>"
  exit 1
fi

echo "🔍 Verifying case: $CASE_ID"
echo ""

# Run verification
RESULT=$(curl -s "$API_BASE/api/case/$CASE_ID/verify")

if [ $? -ne 0 ]; then
  echo "❌ Failed to connect to API"
  exit 1
fi

# Parse result
STATUS=$(echo $RESULT | jq -r '.status')
SOURCES_OK=$(echo $RESULT | jq -r '.sources_verified')
SOURCES_FAIL=$(echo $RESULT | jq -r '.sources_failed')
CLAIMS_OK=$(echo $RESULT | jq -r '.claims_verified')
CLAIMS_FAIL=$(echo $RESULT | jq -r '.claims_failed')
LEDGER=$(echo $RESULT | jq -r '.ledger_integrity')

# Display results
echo "📊 Verification Results:"
echo "  Status: $STATUS"
echo "  Sources: ✓ $SOURCES_OK | ✗ $SOURCES_FAIL"
echo "  Claims: ✓ $CLAIMS_OK | ✗ $CLAIMS_FAIL"
echo "  Ledger: $LEDGER"
echo ""

# Export if valid
if [ "$STATUS" = "valid" ]; then
  echo "✅ Case integrity verified"
  
  # Optional: Export evidence package
  if [ "$EXPORT_ON_SUCCESS" = "true" ]; then
    EXPORT_FILE="evidence-$CASE_ID-$(date +%Y%m%d-%H%M%S).json"
    curl -s "$API_BASE/api/case/$CASE_ID/export" > "$EXPORT_FILE"
    echo "📦 Exported to: $EXPORT_FILE"
  fi
  
  exit 0
else
  echo "❌ Case integrity compromised"
  echo ""
  echo "Details:"
  echo $RESULT | jq '.details'
  exit 1
fi
```

**Usage:**
```bash
chmod +x verify-case.sh
./verify-case.sh case-abc-123

# Or with export
EXPORT_ON_SUCCESS=true ./verify-case.sh case-abc-123
```

---

## Periodic Verification

### Daily Verification Cron Job

```bash
# Add to crontab: crontab -e
# Run at 2 AM daily
0 2 * * * /opt/lantern/scripts/verify-all-cases.sh >> /var/log/lantern/verification.log 2>&1
```

**Script:** `/opt/lantern/scripts/verify-all-cases.sh`

```bash
#!/bin/bash
# Verify all cases nightly

API_BASE="http://localhost:5000"
LOG_DIR="/var/log/lantern"
DATE=$(date +%Y%m%d)

echo "=== Nightly Verification: $DATE ===" >> "$LOG_DIR/verification.log"

# Get all case IDs
CASES=$(curl -s "$API_BASE/api/cases" | jq -r '.cases[].id')

TOTAL=0
PASSED=0
FAILED=0

for CASE_ID in $CASES; do
  ((TOTAL++))
  
  echo "Verifying: $CASE_ID" >> "$LOG_DIR/verification.log"
  
  RESULT=$(curl -s "$API_BASE/api/case/$CASE_ID/verify")
  STATUS=$(echo $RESULT | jq -r '.status')
  
  if [ "$STATUS" = "valid" ]; then
    ((PASSED++))
    echo "  ✓ PASS" >> "$LOG_DIR/verification.log"
  else
    ((FAILED++))
    echo "  ✗ FAIL: $STATUS" >> "$LOG_DIR/verification.log"
    
    # Alert on failure
    echo $RESULT | jq '.' > "$LOG_DIR/failed-$CASE_ID-$DATE.json"
    
    # Optional: Send alert email
    if command -v mail &> /dev/null; then
      echo "Case $CASE_ID verification failed: $STATUS" | \
        mail -s "ALERT: Lantern Verification Failure" \
        ${ALERT_EMAIL:-operator@example.com}
    fi
  fi
done

echo "Summary: $PASSED/$TOTAL passed, $FAILED failed" >> "$LOG_DIR/verification.log"
echo "" >> "$LOG_DIR/verification.log"
```

---

## Troubleshooting

### Wrong Encryption Key

**Symptom:** All source hashes fail

**Fix:**
```bash
# Check current key
echo $LANTERN_VAULT_KEY

# Set correct key
export LANTERN_VAULT_KEY="correct-key-here"

# Restart service
docker-compose restart lantern

# Re-verify
./verify-case.sh case-id
```

### Database Corruption

**Symptom:** Partial failures, random mismatches

**Fix:**
```bash
# Restore from backup
docker-compose exec postgres psql -U lantern -c "DROP DATABASE lantern;"
docker-compose exec postgres psql -U lantern -c "CREATE DATABASE lantern;"

gunzip -c backup.sql.gz | \
  docker-compose exec -T postgres psql -U lantern lantern

# Re-verify
./verify-case.sh case-id
```

### Ledger Chain Broken

**Symptom:** `ledger_integrity: "broken"`

**Fix:**
```bash
# Identify break point
docker-compose exec postgres psql -U lantern lantern -c \
  "SELECT seq, hash, prev_hash FROM ledger_events 
   WHERE case_id = 'case-id' ORDER BY seq;"

# Cannot repair - restore from backup or flag for review
```

---

## Legal Compliance

### What Lantern Guarantees

✅ **Cryptographic integrity:**
- Evidence hasn't been modified since ingestion
- Complete audit trail of all operations
- Deterministic hash verification

✅ **Tamper-evidence:**
- Any modification breaks hash chain
- Ledger shows all custody transfers
- Timestamps for chronological documentation

### What Lantern Does NOT Guarantee

❌ **Document authenticity:**
- Cannot prove original source is genuine
- Cannot detect pre-ingestion forgery
- Cannot validate deep fakes

❌ **Legal admissibility:**
- Depends on jurisdiction
- Requires expert witness testimony
- Must establish chain from original source

### Operator Responsibilities

**Before ingestion:**
1. Document evidence provenance
2. Photograph/screenshot original context
3. Note collection method and date
4. Maintain custody documentation

**During handling:**
1. Minimize number of handlers
2. Use RBAC strictly
3. Log all access
4. Export regularly

**For legal proceedings:**
1. Provide verification logs
2. Explain technical process
3. Present export packages
4. Testify to integrity (not content)

---

## API Quick Reference

| Endpoint | Method | Purpose | Permission |
|----------|--------|---------|------------|
| `/api/case/:id/manifest` | GET | Get manifest | READ |
| `/api/case/:id/verify` | GET | Verify integrity | VERIFY |
| `/api/case/:id/finalize` | POST | Create manifest | WRITE |
| `/api/case/:id/export` | GET | Export evidence | READ |
| `/api/case/:id/claim` | POST | Create claim | WRITE |

---

## Support

- **Documentation:** `/docs` directory
- **Issues:** https://github.com/Swixixle/Lantern/issues
- **Operator Guide:** `OPERATOR_GUIDE.md`
- **Security:** `../SECURITY.md`
