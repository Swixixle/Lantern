# Lantern Product Plan

**Phase**: 2 (Productization) → **v2 Feature Complete**
**Status**: Full-Stack PostgreSQL System Operational
**Date**: February 16, 2026

---

## 1. Product Definition

Lantern is an institutional-grade evidentiary record system that enables analysts to upload source documents, extract evidence anchors, curate claims with posture classifications, generate cryptographically-verified evidence packets, and maintain append-only audit ledgers with hash-chain integrity. The system supports investigative journalism, legal review, and adversarial inquiry workflows with rigorous epistemic safety controls.

**Target User**: Investigative Journalists, Legal Analysts, Compliance Officers, and Researchers who need rigorous, auditable, tamper-evident analysis.

### Core Features (v2 Complete)
1.  **Document Upload**: Text and PDF upload with page-level extraction and rendering
2.  **Evidence Extraction**: Deterministic heuristic extraction via Web Worker (browser) or server-side job queue
3.  **Claim Space**: Primary view with DEFENSIBLE/RESTRICTED/AMBIGUOUS posture classification
4.  **Evidence Packets**: SHA-256 chain-of-custody verification per packet
5.  **Append-Only Ledger**: Hash-chained revision history with independent verification
6.  **Snapshots**: Point-in-time corpus snapshots with integrity verification
7.  **Verified Record**: Canonical output artifact (schema v1.0.0) for legal/journalistic submission
8.  **Constraints**: Automated detection of CONFLICT, MISSING_EVIDENCE, TIME_MISMATCH
9.  **Incident Reports**: Immutable incident documentation
10. **Semantic Lens**: Newsroom/Legal mode toggle with domain-specific labels and export templates
11. **Read-Only Review**: External reviewer access with audit lines
12. **Export Suite**: ZIP bundles, reproducibility packs, one-pagers (newsroom + legal)
13. **Dossier Curation**: Full CRUD for entities, edges, claims, evidence
14. **Shadow-Caste Heuristics**: Influence Hubs, Funding Gravity, Enforcement Map
15. **Cross-Dossier Comparison**: Entity overlap, structural alignment, comparison integrity

---

## 2. Module Status (M1-M12) — Phase 1 Complete

### Completed Modules

| Module | Name | Status | Description |
|--------|------|--------|-------------|
| M1 | Pack Schema & Storage | ✅ DONE | IndexedDB persistence, Pack v2 schema |
| M2 | Dossier Editor | ✅ DONE | Entity, edge, claim, evidence CRUD |
| M3 | Heuristic Analysis | ✅ DONE | Influence, Funding, Enforcement heuristics |
| M4 | Evidence Density | ✅ DONE | Minimum thresholds, insufficient data gating |
| M5 | Report Generation | ✅ DONE | Structured report view |
| M6 | Markdown Export | ✅ DONE | Full report export with YAML frontmatter |
| M7 | Interpretation Limits | ✅ DONE | Disclaimers, "what this doesn't prove" |
| M8 | Migration Transparency | ✅ DONE | Schema version tracking in reports |
| M9 | Print Layout | ✅ DONE | Print-optimized CSS |
| M10 | Claim Scope | ✅ DONE | utterance vs content attribution |
| M11 | Robustness Checks | ✅ DONE | Sensitivity analysis, stability classification |
| M12 | Comparison Integrity | ✅ DONE | SHA-256 fingerprints, tamper-evidence |

---

## 3. Phase 2: Productization (COMPLETE)

### Server-Side Backend
- [x] PostgreSQL database with 17 tables via Drizzle ORM
- [x] 50+ REST API endpoints (server/routes.ts)
- [x] API key authentication with demo login for investor demos
- [x] Server-side extraction job queue (extractionProcessor.ts)
- [x] PDF upload with page-level extraction and PNG rendering (pdfProcessor.ts)

### Claim Space & Evidence System
- [x] Claim Space as primary view (`/`) with DEFENSIBLE/RESTRICTED/AMBIGUOUS posture
- [x] Evidence Packets with SHA-256 chain-of-custody
- [x] Evidence Pack ZIP export with manifest
- [x] Posture system (DRAFT/HIGH_RISK/REVIEW_REQUIRED/EVIDENCE_STRONG)

### Integrity & Audit
- [x] Append-only Ledger with hash chains (shared/ledger.ts)
- [x] Snapshots with integrity verification
- [x] Verified Record canonical output artifact (schema v1.0.0)
- [x] Constraints system (CONFLICT, MISSING_EVIDENCE, TIME_MISMATCH)
- [x] Incident Reports with immutable artifacts

### Corpus & Source Management
- [x] Corpus intake with multi-source management
- [x] Source document management page
- [x] Anchor browser and extraction proof with page images
- [x] Case management

### Review & Export
- [x] Read-only review mode for external reviewers
- [x] Review bundle and audit line views
- [x] Export bundle (ZIP with manifest)
- [x] Reproducibility pack export
- [x] Newsroom and Legal one-pager exports

### UX & Onboarding
- [x] Newsroom/Legal semantic lens toggle
- [x] Tutorial system for onboarding
- [x] Web Worker for browser-side extraction

---

## 4. Architecture Decision Record

### Client/Server Split
- **Decision**: Full-Stack (Server-Authoritative)
- **Rationale**: PostgreSQL provides durable storage, API key auth enables multi-device access, server-side extraction enables large document processing

### Persistence Strategy
- **Server**: PostgreSQL with 17 tables (Drizzle ORM)
- **Client**: IndexedDB via `idb` for local pack storage
- **Files**: Filesystem storage for uploads and rendered PDF pages

### Authentication
- **Method**: API key via `x-api-key` header
- **Demo Mode**: `/api/auth/demo-key` for investor presentations
- **Review Mode**: Read-only access via `/review/:corpusId` routes

### Type Discrimination
- **Pattern**: Explicit schema literals via type guards
- **Extract Pack**: `schema === "lantern.extract.pack.v1"`
- **Dossier Pack**: `schemaVersion === 2`

---

## 5. Known Limitations (v2)

1.  **Single Auth Key**: No multi-user accounts or RBAC; single demo API key
2.  **No LLM Integration**: Extraction is deterministic heuristics only; no shadow NLP
3.  **Client Pack Loss**: IndexedDB packs are browser-local (mitigated by JSON/ZIP export)
4.  **Heuristic Fragility**: Regex extraction is brittle for complex or non-standard formats

---

## 6. Future Roadmap

- [ ] Multi-user support with role-based access control
- [ ] LLM shadow extraction (Gemini/GPT) for improved recall
- [ ] Advanced entity disambiguation and cross-document linking
- [ ] Graph-based relationship mapping (SVO extraction)
- [ ] Batch export to CSV/JSON-L
- [ ] Citation generator from extraction provenance
- [ ] Pack merging tools

---

**Current State**: Phase 2 complete. System is operational with full PostgreSQL backend.
