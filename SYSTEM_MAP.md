# LANTERN SYSTEM MAP

Complete architectural documentation of the Lantern Evidentiary Record System.
Suitable for internal audit, legal review, and future maintainers.

---

## A. High-Level Architecture

### Pages and Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | ClaimSpace | Primary view — Defensible/Restricted/Ambiguous claims with evidence anchors |
| `/intake` | Intake | Corpus creation and document upload |
| `/sources` | Sources | Source document management |
| `/anchors/browse` | AnchorBrowser | Browse evidence anchors |
| `/anchors` | AnchorView | Anchor detail view |
| `/anchors/proof` | AnchorProof | Anchor extraction proof with page images |
| `/packets/:packetId` | EvidencePacket | Evidence packet viewer with chain-of-custody |
| `/ledger` | Ledger | Append-only revision ledger |
| `/constraints` | Constraints | Conflicts, missing evidence, time mismatches |
| `/snapshots` | Snapshots | Corpus snapshot list |
| `/snapshots/:snapshot_id` | SnapshotDetail | Snapshot detail with claims |
| `/verified-record` | VerifiedRecord | Canonical output artifact |
| `/incident-report` | IncidentReport | Incident report viewer |
| `/review/:corpusId` | Review | Read-only review mode for external reviewers |
| `/review/:corpusId/bundle` | ReviewBundle | Review bundle export |
| `/review/:corpusId/audit_lines` | ReviewAuditLines | Audit line review |
| `/library` | Library | Pack library (extract + dossier packs) |
| `/extract` | LanternExtract | Text extraction interface |
| `/dossier/:id` | DossierEditor | Dossier CRUD |
| `/dossier/:id/report` | DossierReport | Publication-ready report |
| `/compare` | DossierComparison | Cross-dossier comparison |
| `/cases` | Cases | Case management |
| `/reference` | HowItWorks | Reference documentation |
| `/legacy` | Dashboard | Archived finance dashboard |

### Major Modules

| Module | Location | Responsibility |
|--------|----------|----------------|
| `auth.tsx` | `client/src/lib/` | API key authentication with demo login |
| `config.tsx` | `client/src/lib/` | App configuration, read-only mode detection |
| `tutorial.tsx` | `client/src/lib/` | Tutorial/onboarding system |
| `posture.ts` | `client/src/lib/` | Readiness posture computation (DRAFT/HIGH_RISK/REVIEW_REQUIRED/EVIDENCE_STRONG) |
| `evidencePack.ts` | `client/src/lib/` | ZIP evidence pack export with manifest |
| `verifyPack.ts` | `client/src/lib/` | Evidence pack verification |
| `vault.ts` | `client/src/lib/` | Case-level CRUD vault |
| `storage.ts` | `client/src/lib/` | IndexedDB persistence layer (idb library, lantern-db v2) |
| `lanternExtract.ts` | `client/src/lib/` | Deterministic text extraction engine |
| `integrity.ts` | `client/src/lib/` | SHA-256 fingerprint generation |
| `comparison.ts` | `client/src/lib/` | Cross-dossier structural comparison |
| `migrations.ts` | `client/src/lib/` | Schema migration v1→v2 |
| `heuristics/` | `client/src/lib/heuristics/` | influenceHubs, fundingGravity, enforcementMap, sensitivity |
| `LensContext.tsx` | `client/src/context/` | Newsroom/Legal semantic lens provider |
| `semanticMap.ts` | `client/src/lens/` | Semantic label mappings for lens modes |
| `templates/` | `client/src/export/templates/` | Export templates: newsroom, legal, one-pagers |
| `extraction.worker.ts` | `client/src/workers/` | Web Worker for browser-side extraction |
| `routes.ts` | `server/` | 50+ REST API endpoints |
| `storage.ts` | `server/` | PostgreSQL storage adapter (Drizzle ORM) |
| `extractionProcessor.ts` | `server/` | Server-side extraction job queue |
| `pdfProcessor.ts` | `server/` | PDF upload + page-level rendering |
| `incidentReportGenerator.ts` | `server/` | Incident report generation |
| `verifiedRecordGenerator.ts` | `server/` | Verified record generation |
| `schema.ts` | `shared/` | Drizzle ORM schema (17 tables) |
| `ledger.ts` | `shared/` | Ledger hash chain logic |
| `verifiedRecord.ts` | `shared/` | Verified record schema |
| `incidentReport.ts` | `shared/` | Incident report schema |
| `bundleVerify.ts` | `shared/` | Bundle verification logic |

### Data Flow

```
Upload (Text/PDF) → Server API → PostgreSQL (uploads, chunks)
       ↓
Extraction (Web Worker or Server Queue) → Anchors (anchor_records)
       ↓
Corpus Build → Claims (claim_records) → Claim Space (DEFENSIBLE/RESTRICTED/AMBIGUOUS)
       ↓
Evidence Packets (evidence_packets) → Chain-of-Custody Verification
       ↓
Ledger Events (ledger_events) → Hash Chain → Append-Only Audit Trail
       ↓
Snapshots (snapshots) → Integrity Verification → Verified Record
       ↓
Export Bundle (ZIP) / Reproducibility Pack / One-Pager / Review Mode
```

---

## B. Database Schema (17 Tables)

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `cases` | Case management containers |
| `uploads` | Uploaded source documents (text, PDF) |
| `upload_pages` | Page-level data for multi-page uploads |
| `chunks` | Text chunks from source documents |
| `extraction_jobs` | Server-side extraction job queue |
| `corpora` | Corpus containers (groups of sources) |
| `corpus_sources` | Source-to-corpus associations |
| `anchor_records` | Evidence anchors extracted from sources |
| `claim_records` | Claims with posture classification |
| `evidence_packets` | Evidence packets with SHA-256 chain-of-custody |
| `snapshots` | Corpus point-in-time snapshots |
| `ledger_events` | Append-only revision ledger with hash chains |
| `pdf_pages` | Rendered PDF page images |
| `constraints` | Conflicts, missing evidence, time mismatches |
| `incident_reports` | Incident reports with immutable artifacts |
| `report_artifacts` | Generated report artifacts |

---

## C. API Endpoints (50+)

### Authentication
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/auth/status | Check authentication status |
| GET | /api/auth/demo-key | Get demo API key for investor demos |

### Configuration
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/config | App configuration and feature flags |

### Review (Read-Only)
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/review/:corpusId/bundle | Review bundle for external reviewers |
| GET | /api/review/:corpusId/audit_lines | Audit line data for review |

### Upload
| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/upload | Upload text document |
| POST | /api/upload/pdf | Upload PDF with page-level extraction |

### Cases
| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | /api/cases | List/create cases |
| GET/PUT/DELETE | /api/cases/:caseId | Case CRUD |
| GET | /api/cases/:caseId/uploads | Uploads for a case |

### Extraction
| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/extract | Start extraction job |
| GET | /api/jobs/:jobId | Poll extraction job status |

### Corpora
| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | /api/corpus | List/create corpora |
| GET | /api/corpus/:corpusId | Get corpus details |
| POST | /api/corpus/:corpusId/sources | Add source to corpus |
| POST | /api/corpus/:corpusId/build | Build corpus (run extraction) |

### Claims
| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | /api/corpus/:corpusId/claims | List/create claims |
| PUT/DELETE | /api/corpus/:corpusId/claims/:claimId | Update/delete claim |
| POST | /api/corpus/:corpusId/claims/:claimId/packet | Generate evidence packet |

### Anchors
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/anchors | List all anchors |
| GET | /api/corpus/:corpusId/anchors | Anchors for a corpus |
| GET | /api/anchors/:anchorId/proof | Anchor extraction proof with page images |

### Sources
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/sources/:sourceId/pages/:pageIndex | Get rendered page image |

### Packets
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/packets/:packetId | Get evidence packet |
| GET | /api/packets/:packetId.pdf | Download packet as PDF |
| GET | /api/packets/:packetId/verify | Verify packet integrity |
| GET | /api/packets/:packetId/verify_chain | Verify full chain-of-custody |

### Constraints
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/constraints | List all constraints (conflicts, gaps, mismatches) |

### Snapshots
| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/snapshots | Create snapshot |
| GET | /api/corpus/:corpusId/snapshots | List snapshots for corpus |
| GET | /api/snapshots/:snapshotId | Get snapshot detail |
| GET | /api/snapshots/:snapshotId/verify | Verify snapshot integrity |

### Ledger
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/corpus/:corpusId/ledger | Get ledger events for corpus |
| GET | /api/ledger/:eventId/verify | Verify ledger event hash chain |

### Export
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/corpus/:corpusId/export_bundle | Export bundle (ZIP with manifest) |
| GET | /api/corpus/:corpusId/export_repro_pack | Export reproducibility pack |

---

## D. Heuristic Pipeline

### Influence Hubs

| Property | Value |
|----------|-------|
| **Inputs** | All edges in dossier |
| **Threshold** | Minimum 3 edges total |
| **Computation** | Degree centrality (count of edges per entity) |
| **Output** | Ranked list of entities by connection count |
| **Failure Mode** | `INSUFFICIENT_DATA` if < 3 edges |

### Funding Gravity

| Property | Value |
|----------|-------|
| **Inputs** | Edges of type: `funded_by`, `donated_to`, `donated_by`, `sponsored_by`, `grant_from`, `grant_to` |
| **Threshold** | Minimum 2 funding edges |
| **Computation** | Count inflows/outflows per entity |
| **Output** | Funding concentration map |
| **Failure Mode** | `INSUFFICIENT_DATA` if < 2 funding edges |

### Enforcement Map

| Property | Value |
|----------|-------|
| **Inputs** | Edges of type: `censored_by`, `banned_by`, `sued_by`, `threatened_by`, `fired_by`, `investigated_by`, `sanctioned_by` |
| **Threshold** | Minimum 1 enforcement edge |
| **Computation** | List of coercive relationships |
| **Output** | Enforcement edge inventory |
| **Failure Mode** | `INSUFFICIENT_DATA` if no enforcement edges |

### Sensitivity / Robustness

| Property | Value |
|----------|-------|
| **Inputs** | All heuristic outputs |
| **Threshold** | At least 2 data points for meaningful test |
| **Computation** | Simulate removal of each entity/edge, check if findings persist |
| **Output** | Stability classification: ROBUST, FRAGILE, SINGLE_POINT |
| **Failure Mode** | Skipped if insufficient base data |

---

## E. Integrity & Safety Layers

### Evidence Packet Chain-of-Custody
- **Algorithm**: SHA-256
- **Scope**: Each evidence packet fingerprinted; full chain verified via `/api/packets/:packetId/verify_chain`
- **Purpose**: Tamper-evidence for individual evidentiary artifacts

### Append-Only Ledger
- **Implementation**: `shared/ledger.ts`
- **Structure**: Each event contains hash of previous event, forming a hash chain
- **Verification**: `/api/ledger/:eventId/verify` checks hash chain integrity
- **Property**: Events cannot be modified or deleted after creation

### Snapshot Verification
- **Implementation**: `server/` snapshot endpoints
- **Verification**: `/api/snapshots/:snapshotId/verify` checks snapshot data integrity
- **Purpose**: Point-in-time corpus state with tamper detection

### Verified Record
- **Implementation**: `server/verifiedRecordGenerator.ts` + `shared/verifiedRecord.ts`
- **Schema**: v1.0.0
- **Purpose**: Canonical output artifact suitable for legal/journalistic submission

### Report Fingerprinting
- **Algorithm**: SHA-256
- **Input**: Canonical JSON of pack data (sorted keys, sorted arrays)
- **Output**: 64-character hex string
- **Location**: Report header, YAML frontmatter in export

### Posture System
- **Levels**: DRAFT, HIGH_RISK, REVIEW_REQUIRED, EVIDENCE_STRONG
- **Computation**: `client/src/lib/posture.ts` evaluates claim evidence density
- **Purpose**: Signal readiness of claims for publication/submission

### Constraints
- **Types**: CONFLICT, MISSING_EVIDENCE, TIME_MISMATCH
- **Detection**: Automated analysis of corpus data for inconsistencies
- **Display**: `/constraints` page with categorized constraint listings

### Incident Reports
- **Generation**: `server/incidentReportGenerator.ts`
- **Property**: Immutable once created
- **Purpose**: Formal record of integrity issues or data anomalies

---

## F. Semantic Lens System

### Lens Modes
- **Newsroom**: Labels and terminology optimized for journalistic workflow
- **Legal**: Labels and terminology optimized for legal/compliance workflow

### Implementation
- `client/src/context/LensContext.tsx` — React context provider for active lens
- `client/src/lens/semanticMap.ts` — Mapping tables between lens modes and UI labels

### Export Templates
- `client/src/export/templates/newsroom.ts` — Newsroom export format
- `client/src/export/templates/legal.ts` — Legal export format
- `client/src/export/templates/newsroomOnePager.ts` — Newsroom one-pager
- `client/src/export/templates/legalOnePager.ts` — Legal one-pager

---

## G. File Structure

```
client/src/
├── App.tsx                           # Router (24 routes)
├── main.tsx                          # React root
├── pages/
│   ├── claim-space.tsx               # Primary view (/)
│   ├── intake.tsx                    # Corpus creation (/intake)
│   ├── sources.tsx                   # Source management (/sources)
│   ├── anchor-browser.tsx            # Anchor browsing (/anchors/browse)
│   ├── anchor-view.tsx               # Anchor detail (/anchors)
│   ├── anchor-proof.tsx              # Extraction proof (/anchors/proof)
│   ├── evidence-packet.tsx           # Packet viewer (/packets/:packetId)
│   ├── ledger.tsx                    # Revision ledger (/ledger)
│   ├── constraints.tsx               # Constraints (/constraints)
│   ├── snapshots.tsx                 # Snapshot list (/snapshots)
│   ├── snapshot-detail.tsx           # Snapshot detail (/snapshots/:id)
│   ├── verified-record.tsx           # Verified record (/verified-record)
│   ├── incident-report.tsx           # Incident report (/incident-report)
│   ├── review.tsx                    # Read-only review (/review/:corpusId)
│   ├── review-bundle.tsx             # Review bundle
│   ├── review-audit-lines.tsx        # Audit lines
│   ├── library.tsx                   # Pack library (/library)
│   ├── lantern-extract.tsx           # Extraction (/extract)
│   ├── dossier-editor.tsx            # Dossier CRUD (/dossier/:id)
│   ├── dossier-report.tsx            # Publication report (/dossier/:id/report)
│   ├── dossier-comparison.tsx        # Cross-dossier (/compare)
│   ├── cases.tsx                     # Case management (/cases)
│   ├── how-it-works.tsx              # Reference (/reference)
│   ├── dashboard.tsx                 # Legacy (/legacy)
│   └── not-found.tsx                 # 404
├── lib/
│   ├── auth.tsx                      # API key authentication
│   ├── config.tsx                    # App config + read-only mode
│   ├── tutorial.tsx                  # Tutorial system
│   ├── posture.ts                    # Readiness posture computation
│   ├── evidencePack.ts               # ZIP evidence pack export
│   ├── verifyPack.ts                 # Evidence pack verification
│   ├── vault.ts                      # Case-level CRUD vault
│   ├── storage.ts                    # IndexedDB persistence (idb)
│   ├── lanternExtract.ts             # Core extraction engine
│   ├── integrity.ts                  # SHA-256 fingerprinting
│   ├── comparison.ts                 # Cross-dossier analysis
│   ├── comparison-export.ts          # Comparison export utilities
│   ├── migrations.ts                 # v1→v2 migration
│   ├── export.ts                     # Export utilities
│   ├── queryClient.ts                # React Query client
│   ├── utils.ts                      # Utility functions
│   ├── sovereigntyEngine.ts          # Legacy engine
│   ├── defaultRamps.ts               # Default configuration
│   ├── schema/
│   │   ├── pack_v1.ts                # Zod schemas for packs
│   │   ├── anchors.ts                # Anchor schemas
│   │   ├── claims.ts                 # Claim schemas
│   │   ├── constraints.ts            # Constraint schemas
│   │   ├── corpus.ts                 # Corpus schemas
│   │   └── provenance.ts             # Provenance schemas
│   ├── heuristics/
│   │   ├── influenceHubs.ts          # Influence Hubs
│   │   ├── fundingGravity.ts         # Funding Gravity
│   │   ├── enforcementMap.ts         # Enforcement Map
│   │   ├── sensitivity.ts            # Robustness analysis
│   │   ├── types.ts                  # Shared heuristic types
│   │   ├── entities/
│   │   │   ├── entityExtractor.ts    # Entity extraction
│   │   │   ├── entityCanonicalizer.ts# Entity canonicalization
│   │   │   ├── entitySanitizer.ts    # Entity sanitization
│   │   │   └── entityTierer.ts       # Entity tiering
│   │   ├── metrics/
│   │   │   └── metricNormalizer.ts   # Metric normalization
│   │   └── segmenters/
│   │       └── sentenceSegmenter.ts  # Sentence segmentation
│   ├── converters/
│   │   └── extract_to_dossier.ts     # Extract→Dossier conversion
│   ├── llm/
│   │   └── contract.ts               # LLM contract definitions
│   └── tests/                        # Unit and integration tests
├── context/
│   └── LensContext.tsx               # Newsroom/Legal lens provider
├── lens/
│   └── semanticMap.ts                # Semantic label mappings
├── export/templates/
│   ├── newsroom.ts                   # Newsroom export
│   ├── legal.ts                      # Legal export
│   ├── newsroomOnePager.ts           # Newsroom one-pager
│   └── legalOnePager.ts              # Legal one-pager
├── workers/
│   └── extraction.worker.ts          # Web Worker for extraction
├── components/                       # UI components (shadcn/ui + custom)
│   ├── TutorialOverlay.tsx           # Tutorial overlay
│   ├── UploadDrawer.tsx              # Upload drawer
│   └── ui/                           # shadcn/ui components
└── fixtures/                         # Golden test fixtures

server/
├── index.ts                          # Express server entrypoint
├── routes.ts                         # 50+ API endpoints
├── storage.ts                        # PostgreSQL storage adapter
├── extractionProcessor.ts            # Server-side extraction job queue
├── pdfProcessor.ts                   # PDF processing
├── incidentReportGenerator.ts        # Incident report generation
├── verifiedRecordGenerator.ts        # Verified record generation
├── static.ts                         # Static file serving
└── vite.ts                           # Vite dev middleware

shared/
├── schema.ts                         # Drizzle ORM schema (17 tables)
├── ledger.ts                         # Ledger hash chain logic
├── verifiedRecord.ts                 # Verified record schema
├── incidentReport.ts                 # Incident report schema
└── bundleVerify.ts                   # Bundle verification
```

---

## H. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-22 | Initial release. M1-M12 complete. Client-only with IndexedDB. |
| 2.0.0 | 2026-02 | Full PostgreSQL backend, 50+ API endpoints, authentication, Claim Space, Evidence Packets, Ledger, Snapshots, Verified Record, Constraints, Incident Reports, PDF upload, Review mode, Semantic lens, Posture system, Tutorial system, Export bundles. |

---

*This map reflects the implementation as of February 2026.*
