# Lantern Product Plan

**Phase**: 2 (Productization)
**Status**: Draft
**Date**: January 21, 2026

---

## 1. Product Definition (MVP)

Lantern is a structured knowledge extraction tool that converts unstructured text into rigorous, verifiable data points (Entities, Quotes, Metrics, Timeline) with strict provenance tracking.

**Target User**: Data Journalists, Financial Analysts, and Researchers who need to audit unstructured sources.

### Core Features (MVP)
1.  **Text Ingestion**: Simple paste/input of raw text.
2.  **Deterministic Extraction**: Rule-based extraction of 4 key types (Entities, Quotes, Metrics, Dates).
3.  **Provenance Tracking**: Every extracted item links back to its exact character offset in the source text.
4.  **Local Library**: Save and load "Extraction Packs" to local storage.
5.  **Diff Engine**: Compare two packs to see exactly what changed (Added/Removed/Modified items).
6.  **Quality Dashboard**: Built-in regression testing against golden fixtures to ensure engine stability.

### Non-Goals (v1)
*   User Accounts / Cloud Sync (Local-first for now).
*   PDF/URL parsing (Text-only input).
*   LLM-based generative extraction (Strict heuristics only for v1 reliability).

---

## 2. Architecture Decision Record (ADR)

### Client/Server Split
*   **Decision**: **Client-Heavy (Thick Client)**.
*   **Rationale**: The current extraction engine (`lanternExtract.ts`) is purely functional and synchronous. Running it in the browser ensures zero latency, offline capability, and privacy (data never leaves the device).
*   **Future Migration**: The `server/` scaffold exists. We will eventually move storage to the backend (Postgres), but the *extraction logic* should remain shared or client-side to maintain the "local-first" feel.

### Persistence Strategy
*   **Current**: `localStorage` (Browser).
*   **Risk**: High data loss risk if cache cleared.
*   **Mitigation (M1)**: Add "Export to JSON" and "Import from JSON" to allow users to back up their work to disk.
*   **Long-term**: Postgres via Drizzle (Server-side).

### Versioning
*   **Schema**: Packs use a semantic version schema (`lantern.extract.pack.v1`).
*   **Compatibility**: Future engine updates (v0.2+) must include migration logic if the Pack schema changes.

---

## 3. Build Plan (Gated Milestones)

### M0: Baseline Stable (COMPLETED)
*   **Goal**: App boots, extracts, saves (local), and passes smoke tests.
*   **Status**: **Green**. `AUDIT_REPORT.md` confirms integrity.

### M1: Data Safety & Portability (COMPLETED)
*   **Goal**: Prevent data loss via file backups.
*   **Deliverables**:
    *   [x] `Export Pack` button (Download JSON).
    *   [x] `Import Pack` button (Upload JSON).
    *   [x] `Clear Library` utility.
*   **Tests**: Verify import restores exact hash ID.

### M2: Heuristic Reliability
*   **Goal**: Reduce noise in extraction.
*   **Deliverables**:
    *   [ ] Improved Metric regex (handle currency symbols like €, £).
    *   [ ] Entity filter (ignore common stopwords/verbs mistakenly capitalized).
    *   [ ] Quote attribution (basic "said X" proximity matching).
*   **Tests**: Add 3 new edge-case fixtures to `client/src/fixtures/`.

### M3: Quality Harness V2
*   **Goal**: Formalize the regression suite.
*   **Deliverables**:
    *   [ ] Visual "Diff" view for regression failures.
    *   [ ] Performance benchmark (time per 1k chars).
*   **Tests**: CI-style script to run quality checks on pre-commit.

### M4: Audit Generation
*   **Goal**: "Show your work" exports.
*   **Deliverables**:
    *   [ ] Generate Markdown report of extraction (Provenance Table).
    *   [ ] "Copy to Clipboard" formatted citation.

### M5: Production Hardening
*   **Goal**: Ready for public URL.
*   **Deliverables**:
    *   [ ] Error Boundary for UI crashes.
    *   [ ] Input character limit (prevent browser freeze).
    *   [ ] Toast notifications for actions.

---

## 4. Backlog Triage

Based on the Audit (Jan 21, 2026), we have cleaned the backlog:

### KEEP (High Priority)
*   `client/src/lib/lanternExtract.ts`: Core asset. Invest heavily here.
*   `client/src/pages/lantern-extract.tsx`: Main UI. Refine UX.

### DOWNGRADE (Low Priority)
*   `server/storage.ts`: `MemStorage` is insufficient. Don't build on it until we switch to Postgres.
*   `shared/schema.ts`: Keep for reference, but unused until M6 (Backend Sync).

### DELETE (Noise)
*   Any unused UI components in `client/src/components/ui/` (Clean up as we go).

---

**Next Step**: Begin **M1 (Data Safety)**.
