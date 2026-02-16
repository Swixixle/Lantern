# Lantern Changelog

All notable changes to the Lantern investigative intelligence platform.

## [2.0.0] - 2026-02 (Phase 2: Productization)

### Server-Side Backend
- PostgreSQL database with 17 tables via Drizzle ORM (shared/schema.ts)
- 50+ REST API endpoints in server/routes.ts
- PostgreSQL storage adapter (server/storage.ts) replacing in-memory MemStorage
- Server-side extraction job queue (server/extractionProcessor.ts)
- PDF upload with page-level extraction and PNG rendering (server/pdfProcessor.ts)
- Incident report generation (server/incidentReportGenerator.ts)
- Verified record generation (server/verifiedRecordGenerator.ts)

### Authentication & Access
- API key authentication via x-api-key header (client/src/lib/auth.tsx)
- Demo login key endpoint (GET /api/auth/demo-key) for investor presentations
- Read-only review mode for external reviewers (/review/:corpusId)
- Review bundle and audit line views

### Claim Space & Evidence System
- Claim Space as primary view (/) with DEFENSIBLE/RESTRICTED/AMBIGUOUS posture classification
- Evidence Packets with SHA-256 chain-of-custody (evidence_packets table)
- Evidence Pack ZIP export with manifest (client/src/lib/evidencePack.ts)
- Evidence pack verification (client/src/lib/verifyPack.ts)
- Posture system: DRAFT, HIGH_RISK, REVIEW_REQUIRED, EVIDENCE_STRONG (client/src/lib/posture.ts)

### Integrity & Audit
- Append-only Ledger with hash chains (shared/ledger.ts, ledger_events table)
- Ledger event verification endpoint (GET /api/ledger/:eventId/verify)
- Corpus Snapshots with integrity verification (snapshots table)
- Snapshot verification endpoint (GET /api/snapshots/:snapshotId/verify)
- Verified Record canonical output artifact, schema v1.0.0 (shared/verifiedRecord.ts)
- Constraints system: CONFLICT, MISSING_EVIDENCE, TIME_MISMATCH (constraints table)
- Incident Reports with immutable artifacts (incident_reports table)
- Bundle verification (shared/bundleVerify.ts)

### Corpus & Source Management
- Corpus intake with multi-source management (/intake)
- Source document management page (/sources)
- Anchor browser (/anchors/browse) and anchor detail view (/anchors)
- Anchor extraction proof with page images (/anchors/proof)
- Case management (/cases)
- Multi-source corpora via corpus_sources table

### Export & Output
- Export bundle ZIP with manifest (GET /api/corpus/:corpusId/export_bundle)
- Reproducibility pack export (GET /api/corpus/:corpusId/export_repro_pack)
- Newsroom export template (client/src/export/templates/newsroom.ts)
- Legal export template (client/src/export/templates/legal.ts)
- Newsroom one-pager (client/src/export/templates/newsroomOnePager.ts)
- Legal one-pager (client/src/export/templates/legalOnePager.ts)
- Evidence packet PDF download (GET /api/packets/:packetId.pdf)

### UX & Interface
- Newsroom/Legal semantic lens toggle (client/src/context/LensContext.tsx)
- Semantic label mappings (client/src/lens/semanticMap.ts)
- Tutorial system for onboarding (client/src/lib/tutorial.tsx)
- App configuration with read-only mode detection (client/src/lib/config.tsx)
- Upload drawer component
- Case-level CRUD vault (client/src/lib/vault.ts)

### Extraction
- Web Worker for browser-side extraction (client/src/workers/extraction.worker.ts)
- Server-side extraction job queue with PostgreSQL backing (server/extractionProcessor.ts)
- PDF page-level extraction and rendering

### New Pages (17 new routes)
- `/` ClaimSpace (primary view, replaced Library as landing)
- `/intake` Intake
- `/sources` Sources
- `/anchors/browse` AnchorBrowser
- `/anchors` AnchorView
- `/anchors/proof` AnchorProof
- `/packets/:packetId` EvidencePacket
- `/ledger` Ledger
- `/constraints` Constraints
- `/snapshots` Snapshots
- `/snapshots/:snapshot_id` SnapshotDetail
- `/verified-record` VerifiedRecord
- `/incident-report` IncidentReport
- `/review/:corpusId` Review
- `/review/:corpusId/bundle` ReviewBundle
- `/review/:corpusId/audit_lines` ReviewAuditLines
- `/cases` Cases

### Database Tables Added (17 total)
- users, cases, uploads, upload_pages, chunks, extraction_jobs, corpora, corpus_sources, anchor_records, claim_records, evidence_packets, snapshots, ledger_events, pdf_pages, constraints, incident_reports, report_artifacts

---

## [1.0.0] - 2026-01-22

### Complete Feature Set (M1-M12)

#### M1: Pack Schema & Storage
- Implemented Pack v2 schema with entities, edges, claims, evidence
- IndexedDB persistence layer with debounced saves
- WHY: Foundation for all data operations

#### M2: Dossier Editor
- Full CRUD for entities, edges, claims, evidence
- Entity combobox with search
- Relationship graph visualization
- WHY: Core data curation interface

#### M3: Heuristic Analysis Engine
- Influence Hubs (degree centrality)
- Funding Gravity (monetary flow analysis)
- Enforcement Map (coercive edge detection)
- WHY: Shadow-Caste pattern detection

#### M4: Evidence Density Thresholds
- Minimum evidence count gating per heuristic
- "Insufficient Data" status propagation
- WHY: Epistemic safety - prevent analysis on sparse data

#### M5: Report Generation
- Structured report view with all findings
- Section layout: title, explanation, content, receipt
- WHY: Publication-ready artifact generation

#### M6: Markdown Export
- Full report export with YAML frontmatter
- Table escaping and formatting
- WHY: Portable, version-controllable output

#### M7: Interpretation Limits & Disclaimers
- Callout blocks explaining heuristic assumptions
- "What This Does NOT Prove" sections
- WHY: Epistemic safety - prevent misinterpretation

#### M8: Migration Transparency
- Schema version tracking
- Migration notes in reports
- WHY: Audit trail for data transformations

#### M9: Print Layout
- Print-optimized CSS
- Hidden navigation in print mode
- WHY: Physical distribution capability

#### M10: Claim Scope Tracking
- claimType and claimScope fields
- utterance vs content attribution
- WHY: Precision in attribution claims

#### M11: Robustness & Sensitivity Checks
- Single-point failure testing
- Stability classification per finding
- WHY: Confidence in finding durability

#### M12: Comparison Integrity
- SHA-256 fingerprints for reports
- Cross-dossier comparison binding
- Tamper-evidence for comparisons
- WHY: Cryptographic audit trail

### Bug Fixes

#### lantern-extract.tsx Corruption (2026-01-22)
- SYMPTOM: Imports inside function body, duplicate code blocks
- CAUSE: Accidental paste/merge corruption
- FIX: Normalized imports to top-level, removed duplicates, restored handlers
- FILES: client/src/pages/lantern-extract.tsx
- VERIFICATION: Build pass, manual testing

#### Type Guard Upgrade (2026-01-22)
- OLD: `"pack_id" in p` structural check
- NEW: `isExtractPack(p)` / `isDossierPack(p)` with schema literals
- FILES: client/src/lib/storage.ts, client/src/pages/lantern-extract.tsx
- WHY: Future-proof discriminated union handling

---

## Post-v1 Hardening - Completed 2026-01-22

### Technical Hardening
- [x] Type guards (isExtractPack, isDossierPack) - with v1/v2 compatibility
- [x] Migration logic enhanced for v1→v2 field transformations
- [x] Fingerprint determinism verified

### UX Polish
- [x] Report view: print CSS, interpretation limits callout
- [x] Comparison view: stats cards, match badges
- [x] Editor view: claimScope selector with helper text

### Verification
- [x] 57/57 tests passing (including v1 pack acceptance tests)
- [x] Build successful
- [x] No LSP errors

---

## Route Identity Fix - 2026-01-22

### Changed
- Root route (`/`) now shows **Library** page (investigative Lantern entrypoint)
- Legacy "Sovereignty" dashboard moved to `/legacy`
- Quick nav updated: Library, Extract, Compare

### Added
- `client/src/pages/library.tsx` - New landing page with:
  - Extract packs section (schema: lantern.extract.pack.v1)
  - Dossier packs section (schemaVersion: 2)
  - Quick actions: New Extract, Compare Dossiers
  - Stats and timestamps for each pack

### Why
Screenshots showed wrong product identity ("Sovereignty Navigation System" instead of investigative Lantern).
User must see the correct investigative workflow on landing.
