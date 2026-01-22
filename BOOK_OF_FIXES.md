# Lantern Book of Fixes

Permanent record of high-risk incidents and remediation for audit purposes.

---

## Incident 001: lantern-extract.tsx Corruption

**Date:** 2026-01-22

### Symptom
- Build failure: `'import' and 'export' may only appear at the top level`
- LSP reporting 50+ diagnostics in single file
- Workflow unable to start

### Root Cause
Duplicate import block and partial function redefinition pasted inside component body at line 118. Structure:
```
Lines 1-117: Valid component start
Lines 118-247: Corrupted duplicate (imports + partial function + JSX fragments)
Lines 248+: Rest of original component
```

### Fix Approach
1. Added missing imports to top of file (createDossierFromExtract, Pack, useLocation)
2. Removed duplicate corrupted section (lines 118-247)
3. Restored missing function definitions (reset, toggleItem, handleLoadPack, handleCompare, downloadJSON, downloadPDF, runQualityTests)
4. Fixed type annotations (LanternPack[] → AnyPack[])
5. Fixed scoreExtraction call signature

### Verification Gates Run
- [x] `npm run build` - PASS
- [x] Import count check: 22 top-level imports
- [x] Export count check: 1 export default function
- [x] Workflow running without console errors
- [x] Manual: Extract → Promote → Editor flow

### Files Changed
- client/src/pages/lantern-extract.tsx
- client/src/lib/lanternExtract.ts (added z import, LanternPack type export)

---

## Incident 002: Type Guard Upgrade

**Date:** 2026-01-22

### Issue
Structural type discrimination using `"pack_id" in p` could accidentally overlap if schemas evolve.

### Old Pattern
```typescript
const existing = savedPacks.find(p => "pack_id" in p ? p.pack_id : p.packId);
```

### New Pattern
```typescript
// storage.ts
export function isExtractPack(p: AnyPack): p is LanternPack {
  return "schema" in p && p.schema === "lantern.extract.pack.v1";
}

export function isDossierPack(p: AnyPack): p is Pack {
  return "schemaVersion" in p && (p as Pack).schemaVersion === 2;
}

// Usage
const existing = savedPacks.find(p => isExtractPack(p) ? p.pack_id : p.packId);
```

### Verification
- [x] `npm run build` - PASS
- [x] Type guards exported and used consistently

### Files Changed
- client/src/lib/storage.ts (added type guards)
- client/src/pages/lantern-extract.tsx (updated to use guards)

---

## Bookkeeping Standards

For any future incident:
1. Record symptom, root cause, fix approach
2. List verification gates run
3. List files changed
4. Note any behavior changes visible to users
