# LANTERN SYSTEM SNAPSHOT

Portable reference document for external review.
Generated: 2026-02-16

---

## A. What This System Is

Lantern is an institutional-grade evidentiary record system for investigative analysis. It allows analysts to upload source documents (text and PDF), extract structured evidence anchors, curate claims with posture classifications, generate cryptographically-verified evidence packets, and maintain an append-only audit ledger with hash-chain integrity. The system operates as a full-stack application with a PostgreSQL backend (17 tables), 50+ REST API endpoints, and a React frontend. All analysis requires human-in-the-loop curation. The system does not issue verdicts. Outputs are designed to withstand legal and journalistic scrutiny by emphasizing traceability, chain-of-custody, and tamper-evidence over persuasion.

---

## B. What This System Is NOT

- **Not generative truth**: Lantern does not generate facts or conclusions.
- **Not predictive**: Lantern does not forecast outcomes or behaviors.
- **Not a recommender**: Lantern does not suggest actions or next steps.
- **Not verdict-issuing**: Lantern does not determine guilt, innocence, intent, or truth.
- **Not autonomous**: All claims and evidence curation is human-driven. Heuristics produce conditional findings, not conclusions.
- **Not an LLM system**: Extraction is deterministic regex-based heuristics, not AI-generated.

---

## C. Core Objects & Schemas

### Database Tables (PostgreSQL, 17 tables)

| Table | Purpose |
|-------|---------|
| users | User accounts |
| cases | Case management containers |
| uploads | Source documents (text, PDF) |
| upload_pages | Page-level data for uploads |
| chunks | Text chunks from source documents |
| extraction_jobs | Server-side extraction job queue |
| corpora | Corpus containers grouping sources |
| corpus_sources | Source-to-corpus associations |
| anchor_records | Evidence anchors extracted from sources |
| claim_records | Claims with posture (DEFENSIBLE/RESTRICTED/AMBIGUOUS) |
| evidence_packets | Evidence packets with SHA-256 chain-of-custody |
| snapshots | Point-in-time corpus snapshots |
| ledger_events | Append-only revision ledger with hash chains |
| pdf_pages | Rendered PDF page images |
| constraints | Conflicts, missing evidence, time mismatches |
| incident_reports | Incident reports with immutable artifacts |
| report_artifacts | Generated report artifacts |

### Client-Side Objects

| Object | Storage | Purpose |
|--------|---------|---------|
| Extract Pack | IndexedDB (idb) | Extraction results from source text |
| Dossier Pack | IndexedDB (idb) | Curated entities, edges, claims, evidence |
| Verified Record | Server (PostgreSQL) | Canonical output artifact (schema v1.0.0) |

---

## D. System Flow (Stepwise)

1. **Upload**: User uploads source documents (text or PDF) via `/intake`
2. **Store**: Server stores documents in PostgreSQL (`uploads`, `upload_pages`, `chunks`) and filesystem (`uploads/`)
3. **Extract**: Extraction runs via Web Worker (browser) or server-side job queue (`extraction_jobs`); produces evidence anchors
4. **Anchor**: Evidence anchors stored in `anchor_records` with source provenance and character offsets
5. **Corpus Build**: Sources grouped into corpora; corpus build processes all sources
6. **Claim**: Users create claims in Claim Space with posture classification (DEFENSIBLE/RESTRICTED/AMBIGUOUS)
7. **Evidence Packet**: Claims linked to evidence anchors; packets generated with SHA-256 chain-of-custody
8. **Ledger**: All mutations recorded in append-only ledger with hash chains
9. **Snapshot**: Point-in-time corpus snapshots with integrity verification
10. **Constraints**: Automated detection of conflicts, missing evidence, and time mismatches
11. **Verified Record**: Canonical output artifact generated for legal/journalistic submission
12. **Export**: ZIP bundle with manifest, reproducibility pack, or one-pager export
13. **Review**: External reviewers access read-only review mode with audit lines

---

## E. Heuristic Lenses

### Influence Hubs
- **Measures**: Degree centrality — which entities have the most relationship edges
- **Minimum threshold**: 3 edges
- **Insufficient data behavior**: Returns "Insufficient Data" status; no findings produced

### Funding Gravity
- **Measures**: Concentration and flow of monetary edges (funded_by, donated_to, grant_from, etc.)
- **Minimum threshold**: 2 funding edges
- **Insufficient data behavior**: Returns "Insufficient Data" status; no findings produced

### Enforcement Map
- **Measures**: Presence of coercive edges (censored_by, banned_by, sued_by, fired_by, etc.)
- **Minimum threshold**: 1 enforcement edge
- **Insufficient data behavior**: Returns "No Enforcement Edges Detected"

### Sensitivity / Robustness
- **Measures**: Whether findings survive removal of any single entity or edge
- **Minimum threshold**: 2 data points for meaningful simulation
- **Output classifications**: ROBUST, FRAGILE, SINGLE_POINT
- **Insufficient data behavior**: Section omitted from report

---

## F. Safety & Epistemic Controls

### Claim Posture System
- **DEFENSIBLE**: Claim supported by sufficient evidence anchors
- **RESTRICTED**: Claim has evidence but with caveats or limitations
- **AMBIGUOUS**: Claim lacks sufficient evidence for classification
- **Computation**: `client/src/lib/posture.ts` evaluates evidence density per claim

### Readiness Posture
- **DRAFT**: Corpus under construction
- **HIGH_RISK**: Significant constraints or missing evidence
- **REVIEW_REQUIRED**: Constraints present but manageable
- **EVIDENCE_STRONG**: Sufficient evidence with no critical constraints

### Chain-of-Custody
- Evidence packets are SHA-256 fingerprinted at creation
- Full chain verification available via API (`/api/packets/:packetId/verify_chain`)
- Each link in the chain is independently verifiable

### Append-Only Ledger
- Every mutation creates a ledger event
- Each event contains hash of previous event (hash chain)
- Events cannot be modified or deleted
- Chain integrity verifiable via API (`/api/ledger/:eventId/verify`)

### Constraints System
- **CONFLICT**: Contradictory evidence or claims detected
- **MISSING_EVIDENCE**: Claims without sufficient anchor support
- **TIME_MISMATCH**: Temporal inconsistencies in evidence

### Interpretation Limits
- Every report includes explicit disclaimers about what findings do NOT imply
- Heuristic outputs are conditional on recorded data only

### Evidence Density Thresholds
- Each heuristic has a minimum edge count before analysis proceeds
- System refuses to produce findings below threshold
- Refusal is correct behavior, not failure

---

## G. Integrity & Auditability

### Evidence Packet Fingerprinting
- **Algorithm**: SHA-256
- **Scope**: Individual packet content + linked anchors
- **Verification**: `/api/packets/:packetId/verify` and `/api/packets/:packetId/verify_chain`

### Ledger Hash Chain
- **Structure**: Each event hashes its content plus the previous event's hash
- **Verification**: `/api/ledger/:eventId/verify` checks chain from event back to genesis
- **Property**: Any modification to any event breaks the chain for all subsequent events

### Snapshot Integrity
- **Method**: Snapshot captures corpus state at point in time
- **Verification**: `/api/snapshots/:snapshotId/verify`
- **Purpose**: Provably frozen state for audit or legal submission

### Verified Record
- **Schema**: v1.0.0
- **Purpose**: Canonical output artifact suitable for legal/journalistic submission
- **Generation**: `server/verifiedRecordGenerator.ts`

### Export Bundle
- **Format**: ZIP with JSON manifest
- **Contents**: All claims, anchors, packets, ledger events, constraints
- **Verification**: `shared/bundleVerify.ts` for bundle integrity checking
- **Reproducibility Pack**: Complete data package for independent verification

### Report Fingerprinting
- **Algorithm**: SHA-256
- **Input**: Canonical JSON of pack data (sorted keys, sorted arrays)
- **Purpose**: Tamper-evidence for the exact state analyzed

---

## H. Authentication & Access Control

### API Key Authentication
- **Mechanism**: `x-api-key` header on all API requests
- **Implementation**: `client/src/lib/auth.tsx`
- **Demo Mode**: `/api/auth/demo-key` provides a demo key for investor presentations

### Read-Only Review Mode
- **Routes**: `/review/:corpusId`, `/review/:corpusId/bundle`, `/review/:corpusId/audit_lines`
- **Purpose**: External reviewers can inspect corpus without modification capability
- **Detection**: `client/src/lib/config.tsx` detects read-only context

### Semantic Lens
- **Modes**: Newsroom, Legal
- **Implementation**: `client/src/context/LensContext.tsx` + `client/src/lens/semanticMap.ts`
- **Effect**: Changes UI labels and export templates to match domain vocabulary

---

## I. Intended Use Cases

- **Investigative journalism**: Mapping relationships between actors across source materials with chain-of-custody evidence
- **Legal review**: Structuring evidence and claims with traceable provenance and tamper-evident packaging
- **Historical analysis**: Recording documented relationships and events without inference
- **Adversarial inquiry**: Testing claims against evidence with explicit sufficiency checks and constraint detection
- **Regulatory compliance**: Producing verified records with append-only audit trails
- **External review**: Sharing read-only corpus access with reviewers or auditors

---

## J. Visual Surfaces

| Surface | Route | Purpose |
|---------|-------|---------|
| Claim Space | `/` | Primary view — claims organized by posture with evidence anchors |
| Intake | `/intake` | Corpus creation and document upload |
| Sources | `/sources` | Source document management |
| Anchor Browser | `/anchors/browse` | Browse all evidence anchors |
| Anchor Proof | `/anchors/proof` | Extraction proof with source page images |
| Evidence Packet | `/packets/:id` | Packet viewer with chain-of-custody |
| Ledger | `/ledger` | Append-only revision history |
| Constraints | `/constraints` | Conflicts, missing evidence, time mismatches |
| Snapshots | `/snapshots` | Point-in-time corpus snapshots |
| Verified Record | `/verified-record` | Canonical output artifact |
| Incident Report | `/incident-report` | Formal incident documentation |
| Review Mode | `/review/:corpusId` | Read-only external review |
| Library | `/library` | Extract and dossier pack browser |
| Extract | `/extract` | Text extraction interface |
| Dossier Editor | `/dossier/:id` | Entity, edge, claim, evidence CRUD |
| Dossier Report | `/dossier/:id/report` | Publication-ready report |
| Comparison | `/compare` | Cross-dossier structural alignment |
| Cases | `/cases` | Case management |
| Reference | `/reference` | System documentation |

---

*End of snapshot.*
