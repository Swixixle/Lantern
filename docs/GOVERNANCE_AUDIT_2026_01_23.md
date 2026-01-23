# Lantern/Nikodemus Governance Audit

**Generated**: 2026-01-23  
**Commit**: 6ca74f2  
**Branch**: main

**Verification**: `git rev-parse --short HEAD` matches snapshot commit hash.

---

## Deliverable 0: Snapshot & Change Audit

### Repo Snapshot Summary

| Component | Value |
|-----------|-------|
| **Framework** | React 19 + Vite + TypeScript (frontend), Express 5 (backend) |
| **Runtime** | Node.js (tsx dev, node prod) |
| **Database** | IndexedDB (browser-local), Drizzle ORM scaffold (unused) |
| **Storage** | `client/src/lib/storage.ts` — IndexedDB persistence layer |
| **Server Entrypoint** | `server/index.ts` |
| **Client Entrypoint** | `client/src/main.tsx` |

### Key Directories

```
client/src/
├── pages/              # 9 routes (Library, Extract, Editor, Report, Compare, etc.)
├── lib/                # Core logic (extraction, heuristics, storage, schema)
│   ├── heuristics/     # Analysis algorithms (influence, funding, enforcement)
│   └── schema/         # Pack schema v2
├── components/         # UI primitives (shadcn/ui + custom)
server/
├── index.ts            # Express entrypoint (static host only)
├── routes.ts           # Dev-only /__boot, /__health (empty in prod)
docs/
├── investor/           # Pitch materials (2 lanes)
├── snapshots/          # Safe snapshot system
```

### Change Audit (Since Snapshot Policy Implementation)

| Commit | Summary | Governance Impact |
|--------|---------|-------------------|
| 6ca74f2 | Session save checkpoint | None |
| 20eaffd | Create snapshot system | **NEW**: Denylist-enforced safe export |
| 4e5709f | Add stress-test Q&A | Investor doc (07_STRESS_TEST_QA.md) |
| 610d287 | Session save | None |
| 1e06588 | AI governance investor docs | Docs 04-06 governance lane |
| c437a76 | Compliance investor docs | Docs 01-03 compliance lane |
| 2a0a452 | Production hardening | Server safety (EADDRINUSE, error sanitization) |
| dcff63c | Port conflict fix | Runtime safety |
| 07e4455 | Boot/health routes | Dev-only diagnostics (gated) |

**Baseline**: Commit `20eaffd` is the first with enforced snapshot policy.

### Tech Debt Identified

1. **Drizzle ORM scaffold unused** — `shared/schema.ts` defines `users` table but no API uses it
2. **No backend API endpoints** — `server/routes.ts` contains only dev diagnostics
3. **No caseId infrastructure** — Required for upload feature
4. **No LLM integration yet** — Backlog items only

---

## Deliverable 1: Current-State Architecture Map

### Frontend Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Library | Pack management, import/export |
| `/extract` | LanternExtract | Text extraction UI |
| `/dossier/:id` | DossierEditor | Dossier CRUD |
| `/dossier/:id/report` | DossierReport | Publication-ready reports |
| `/compare` | DossierComparison | Cross-dossier analysis |
| `/reference` | HowItWorks | Methodology docs |
| `/legacy` | Dashboard | (Legacy, unused) |
| `/legacy/core` | LanternCore | (Legacy, unused) |

### Backend Endpoints

| Method | Path | Status |
|--------|------|--------|
| GET | `/__boot` | Dev-only (404 in prod) |
| GET | `/__health` | Dev-only (404 in prod) |

**No active API endpoints exist.** All data operations use browser IndexedDB.

### Database Schema (Drizzle - Unused Scaffold)

```typescript
// shared/schema.ts
users: { id, username, password }
```

**No cases, uploads, or chunks tables exist.**

### LLM Pipeline

**Status: NOT IMPLEMENTED**

No LLM calls exist in the codebase. References to OpenAI/Claude appear only in:
- `docs/investor/*.md` (pitch materials)
- `client/src/lib/PHASE_3_BACKLOG.md` (future work)

### Extraction Pipeline (Local, Deterministic)

```
Source Text
    ↓
lanternExtract.ts (rule-based NLP)
    ↓
LanternPack { entities, quotes, metrics, timeline }
    ↓
extract_to_dossier.ts (converter)
    ↓
Pack (Dossier schema v2)
    ↓
storage.ts (IndexedDB persistence)
```

### Auth/Session

**Status: NOT IMPLEMENTED**

Passport.js is a dependency but no auth routes or session management exists.

---

## Deliverable 2: What's Broken / Confusing

| Severity | Issue | Repro Steps |
|----------|-------|-------------|
| **CRITICAL** | No case infrastructure | Cannot bind uploads to cases - no `cases` table |
| **CRITICAL** | No upload API | No `/api/cases/:caseId/uploads` endpoints |
| **HIGH** | Active case confusion | No UI indicator of "current case" context |
| **HIGH** | Missing decision fields | No `decisionTarget`, `decisionTime` in Pack schema |
| **MEDIUM** | Legacy routes visible | `/legacy` and `/legacy/core` accessible but unused |
| **LOW** | Boot probe logging | BOOT-PROBE console.log statements in production main.tsx |

### Critical Path Blockers

1. **Cannot upload files** — No upload infrastructure exists
2. **Cannot bind to case** — No case model, no caseId in paths
3. **No ingestion states** — No state machine for upload → ready flow

---

## Deliverable 3: Missing-Field Audit

### Case Build Completeness

| Field | Status | Location |
|-------|--------|----------|
| `caseId` | **MISSING** | Not in schema |
| `decisionTarget` | **MISSING** | Not in Pack schema |
| `decisionTime` | **MISSING** | Not in Pack schema |
| Prerequisites | **MISSING** | No structured prereqs |
| Evidence type | PARTIAL | `EvidenceSchema.sourceType` exists |
| Provenance | PARTIAL | `localHash`, `url`, `date` in Evidence |
| Case status | **MISSING** | No case lifecycle |
| Printout immutability | PARTIAL | SHA-256 fingerprint in reports |

### Required Schema Additions

```typescript
// Needed in shared/schema.ts
cases: { id, name, status, decisionTarget, decisionTime, createdAt, updatedAt }
uploads: { id, caseId(FK), filename, mimeType, sha256, ingestionState, createdAt }
upload_pages: { id, uploadId(FK), pageNumber, storagePath }
chunks: { id, caseId(FK), uploadId(FK), pageNumber, chunkIndex, content }
```

---

## Deliverable 4: Data Model Sanity & Governance Constraints

### Current State

| Table | FK Constraints | Indexes | Cascade | Archive |
|-------|----------------|---------|---------|---------|
| users | N/A | username (unique) | N/A | No |

**No other tables exist.**

### Required Governance Constraints

1. **uploads.caseId** → NOT NULL, FK to cases with ON DELETE CASCADE
2. **chunks.caseId** → NOT NULL, FK to cases
3. **chunks.uploadId** → NOT NULL, FK to uploads
4. **Indexes**: `(caseId, createdAt)` on uploads, `(caseId, uploadId)` on chunks
5. **Soft delete**: Add `deletedAt` column, never hard delete case data
6. **Immutability**: Add `sealed: boolean` for finalized records

---

## Deliverable 5: Upload Feature Implementation Plan

### Phase 1A: Database Schema

**File**: `shared/schema.ts`

```typescript
// Add after users table
export const cases = pgTable("cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"), // active, sealed, archived
  decisionTarget: text("decision_target"),
  decisionTime: text("decision_time"), // ISO datetime
  createdAt: text("created_at").notNull().default(sql`now()`),
  updatedAt: text("updated_at").notNull().default(sql`now()`)
});

export const uploads = pgTable("uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  evidenceType: text("evidence_type").notNull(), // document, photo, scan, note
  sha256: text("sha256"),
  ingestionState: text("ingestion_state").notNull().default("uploaded"),
  storagePath: text("storage_path"),
  createdAt: text("created_at").notNull().default(sql`now()`)
});

export const chunks = pgTable("chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id),
  uploadId: varchar("upload_id").notNull().references(() => uploads.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number"),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`now()`)
});
```

### Phase 1B: API Endpoints

**File**: `server/routes.ts`

```typescript
// Case-scoped upload routes
POST /api/cases                           // Create case
GET  /api/cases                           // List cases
GET  /api/cases/:caseId                   // Get case
POST /api/cases/:caseId/uploads/init      // Init upload (get signed URL or local path)
POST /api/cases/:caseId/uploads/complete  // Complete upload (finalize, start ingestion)
GET  /api/cases/:caseId/uploads           // List uploads for case
GET  /api/cases/:caseId/uploads/:uploadId // Get upload detail + ingestion state
```

### Phase 1C: Upload UI

**File**: `client/src/components/UploadDrawer.tsx`

Tabs:
1. **Files** — Drag/drop zone + file browser (PDF/DOCX/TXT/images)
2. **Photos** — Camera capture (MediaDevices API)
3. **Scan** — Multi-page capture workflow

Header shows: "Attach to Case: {caseName}" (read-only)

### Phase 1D: Ingestion State Machine

**States**: `UPLOADED → STORED → EXTRACTED → CHUNKED → INDEXED → READY`

**Failure states**: `FAILED_STORING`, `FAILED_EXTRACTION`, `FAILED_CHUNKING`, `FAILED_INDEXING`

**Implementation**: Background job polling (no WebSockets in MVP)

---

## Deliverable 6: Top 10 Prioritized Fix Plan

| Priority | Task | Impact | Effort | Files |
|----------|------|--------|--------|-------|
| 1 | Create cases table + API | Unlocks all case binding | M | shared/schema.ts, server/routes.ts |
| 2 | Create uploads table + API | Enables file attachment | M | shared/schema.ts, server/routes.ts |
| 3 | Implement Upload Drawer UI | User-facing feature | M | client/src/components/UploadDrawer.tsx |
| 4 | Add ingestion state machine | Track upload processing | M | server/jobs/ingestion.ts |
| 5 | Create chunks table | Enable retrieval | S | shared/schema.ts |
| 6 | Add decisionTarget/Time to Pack | Governance compliance | S | client/src/lib/schema/pack_v1.ts |
| 7 | Remove legacy routes | Clean UX | S | client/src/App.tsx |
| 8 | Remove BOOT-PROBE logging | Production hygiene | S | client/src/main.tsx |
| 9 | Implement LLM call contract | Governance gating | L | client/src/lib/llm/contract.ts |
| 10 | Add soft delete to all tables | Archive vs delete | S | shared/schema.ts |

---

## Deliverable 7: Verification Checklist

### Manual Demo Test Steps

- [ ] **Create case**: POST /api/cases → returns caseId
- [ ] **Upload file**: POST /api/cases/:caseId/uploads/init → POST .../complete → see state=STORED
- [ ] **Ingestion transitions**: Watch state progress STORED → EXTRACTED → CHUNKED → READY
- [ ] **Chunks belong to case**: GET /api/cases/:caseId/chunks returns case-scoped data
- [ ] **Photo capture**: Click Photos tab → capture → file bound to case
- [ ] **Scan multi-page**: Click Scan tab → capture 3 pages → produces ordered pages
- [ ] **Upload without case BLOCKED**: Attempt upload with no caseId → UI shows "Select a case first"
- [ ] **LLM without context BLOCKED**: Call LLM endpoint without caseId/decisionTarget → returns `{ type: "CONTEXT_REQUIRED", missing_fields: [...] }`

---

## Deliverable 8: Naming Sweep (ELI/CABINET)

### Code Files Checked

| Path | Status |
|------|--------|
| `client/src/**/*.tsx` | **CLEAN** — No ELI/CABINET references |
| `client/src/**/*.ts` | **CLEAN** — No ELI/CABINET references |
| `server/**/*.ts` | **CLEAN** — No ELI/CABINET references |
| `shared/**/*.ts` | **CLEAN** — No ELI/CABINET references |

### Documentation

| Path | Status |
|------|--------|
| `docs/investor/*.md` | **CLEAN** — Lantern/Nikodemus only |
| `README.md` | **CLEAN** |
| `replit.md` | **CLEAN** |
| `SYSTEM_MAP.md` | **CLEAN** |

### Note

The only ELI/CABINET mentions exist in `attached_assets/` (user-provided instruction files) which are excluded from snapshots and not part of the application.

---

## Summary

**Current State**: Lantern is a local-first extraction and dossier curation tool with no backend API, no case infrastructure, and no upload capability.

**Required for Case-Bound Governance**:
1. PostgreSQL with cases/uploads/chunks tables
2. Case-scoped API endpoints
3. Upload UI with Files/Photos/Scan tabs
4. Ingestion state machine
5. LLM call contract with fail-closed gating

**Naming**: Clean. No ELI/CABINET product confusion.

**Next Action**: Implement Phase 1 schema and API (cases + uploads tables).
