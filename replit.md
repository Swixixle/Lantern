# Lantern - Investigative Intelligence Platform

## Overview

Lantern is a client-side investigative journalism intelligence platform that enables analysts to:
1. Extract structured data from unstructured text (entities, quotes, metrics, timeline events)
2. Curate dossiers with entities, edges, claims, and evidence
3. Apply "Shadow-Caste" heuristics to detect structural patterns (influence hubs, funding flows, enforcement actions)
4. Generate publication-ready reports with cryptographic integrity fingerprints

The application is a **client-heavy hybrid** architecture with server-side durability for large document extraction. Data persists to IndexedDB locally, with server-side PostgreSQL job queue for documents exceeding 75K characters.

### Server-Side Job Queue (Institutional-Grade Durability)
- **Threshold-Based Routing**: Documents <75K chars use browser Web Worker; ≥75K use server job queue
- **PostgreSQL Persistence**: Jobs survive page refresh and server restarts
- **Automatic Recovery**: localStorage stores job_id for reconnection on page load with 2-second polling
- **Stall Detection**: 30-second client-side watchdog with amber warning UI; server has 5-minute timeout
- **Job States**: `pending`, `processing`, `completed`, `failed`, `cancelled`

### Verified Record (Canonical Output Artifact)
The **Verified Record** is the single deterministic, printable output artifact for every corpus run:
- **Schema**: `lantern.verified_record.v1`
- **Contents**:
  - All input sources with SHA-256 hashes
  - All supported claims (DEFENSIBLE) with exact source anchors
  - All restricted claims (REFUSED) with refusal reasons
  - All ambiguous claims
  - Conflicts, missing evidence, and time mismatches
  - Integrity metadata (SHA-256 content hash, timestamp, schema version)
- **Serialization**: JSON (canonical) and text-based PDF export
- **Determinism**: All arrays sorted by ID, canonical JSON serialization with sorted keys
- **API Endpoints**:
  - `GET /api/corpus/:corpusId/verified-record` - JSON export
  - `GET /api/corpus/:corpusId/verified-record.pdf` - Text-based printable export
- **Purpose**: Courts, regulators, executives, and audits

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Runtime Architecture
- **Frontend**: React + Vite + TypeScript single-page application
- **Storage**: IndexedDB via `idb` library (local-first architecture)
- **Server**: Express server with extraction job queue API endpoints
- **Database**: PostgreSQL for durable job queue persistence (extraction_jobs table)
- **Web Worker**: Browser-side extraction for documents <75K characters

### Core Data Model
Two discriminated pack types coexist in the library:
- **Extract Packs** (`schema: "lantern.extract.pack.v1"`): Machine-extracted, provenance-heavy input artifacts
- **Dossier Packs** (`schemaVersion: 2`): Curated, claim-bearing output artifacts with entities, edges, evidence, and claims

### Key Modules

**Extraction Engine** (`client/src/lib/lanternExtract.ts`)
- Deterministic, rule-based text extraction
- Produces entities, quotes, metrics, and timeline events
- Enforces provenance validation: "No offset, no item"
- Stable IDs via SHA-256 hashing of content + offsets
- **Sanitation Pass** (v0.1.6): Entity denylist, type classification, confidence scoring

**Entity Sanitizer** (`client/src/lib/heuristics/entities/entitySanitizer.ts`)
- 120+ word denylist blocking stopwords, temporal phrases, citation scaffolding
- Entity type classification: Person, Organization, Location, Event, Product
- Confidence scoring per entity: span_length + ontology_match + canonical_frequency
- Canonical collapse: deduplicates exact position matches
- Reclassification: Temporal phrases → Timeline events

**Trust Contract** (Pack Metadata)
- `schema_version`: Pack schema identifier
- `confidence_model`: Scoring formula used
- `sanitation_pass`: Boolean indicating sanitation applied
- `pack_confidence`: Aggregate confidence score (0-1)
- `confidence_threshold`: Minimum confidence for inclusion (default 0.5)

**Heuristics System** (`client/src/lib/heuristics/`)
- Influence Hubs: Degree centrality analysis
- Funding Gravity: Monetary flow and concentration detection
- Enforcement Map: Coercive edge detection (censorship, bans, lawsuits)
- All heuristics include evidence density thresholds and sufficiency gating

**Persistence Layer** (`client/src/lib/storage.ts`)
- Debounced saves to prevent write storms
- Schema versioning with migration support
- Export/Import with lossless round-trip guarantee
- Binary dedupe policy: on pack_id collision, SKIP (no field-level merging)

**Report Generation** (`client/src/pages/dossier-report.tsx`)
- Structured reports with cryptographic fingerprints (SHA-256)
- Markdown export with YAML frontmatter
- Interpretation limits and disclaimers for epistemic safety
- Print-optimized CSS

### Hard Invariants (Non-Negotiable)
1. **Determinism**: Same input + options = identical output JSON
2. **No Offset, No Item**: Missing/invalid offsets cause silent discard
3. **Document-Absolute Offsets**: All offsets reference original source indices
4. **Stable IDs**: Hash-based, never random UUIDs
5. **Binary Import Policy**: Pack collision = SKIP, no partial merging
6. **No Guessing**: Ambiguous data marked UNRESOLVED, not inferred

### Semantic Lens System
- **LensContext** (`client/src/context/LensContext.tsx`): React context providing `lens` (newsroom|legal) and `setLens`
- **Semantic Map** (`client/src/lens/semanticMap.ts`): Maps internal statuses to lens-specific labels
  - Newsroom: VERIFIED / UNSOURCED / CONTESTABLE
  - Legal: SUPPORTED / UNSUBSTANTIATED / DISPUTED
- **Export Templates** (`client/src/export/templates/`):
  - `newsroom.ts`: Editor Review Packet format
  - `legal.ts`: Case Memorandum + Exhibit Index format
- Switching lens does NOT refetch data — only re-renders labels
- **Lens persistence**: Canonical source is vault meta (`preferredLens`); localStorage fallback for backwards compatibility

### Local Vault (Unified DB)
- **Single IndexedDB** (`lantern-db` v2): All data in one canonical database
  - `root` store: Pack library (existing)
  - `cases` store: Case-level CRUD records
  - `vault_meta` store: Key-value metadata (lens preference, migration flags)
- **Vault** (`client/src/lib/vault.ts`): Case-level CRUD abstraction importing `getDB()` from storage.ts
- **Storage** (`client/src/lib/storage.ts`): Pack-level persistence + shared DB export
- No second IndexedDB. Vault and storage share the same connection.
- localStorage migration runs once on startup

### Evidence Pack (ZIP Export)
- **Schema**: `lantern.evidence_pack.v0`
- **Contents**: MANIFEST.json, DOSSIER.md, ONE_PAGER.md, CLAIMS.json, SOURCES.json, APP.json
- **Integrity**: SHA-256 hash per file in manifest
- **Honesty**: `raw_sources_included: false` with reason documented
- **Lens-aware**: Export uses selected lens template (newsroom or legal)
- **Verify**: Upload .zip to verify all file hashes against manifest (VERIFIED/FAILED/VERIFIED_WITH_WARNINGS)
- **One-Pagers**: Editor One-Pager (newsroom) / Counsel One-Pager (legal) — concise 10-20 bullet summaries

### Verified Record (Canonical Output Artifact)
The **Verified Record** is the single deterministic, printable output artifact for every corpus run:
- **Schema**: `lantern.verified_record.v1`
- **Contents**:
  - All input sources with SHA-256 hashes
  - All supported claims (DEFENSIBLE) with exact source anchors
  - All restricted claims (REFUSED) with refusal reasons
  - All ambiguous claims
  - Conflicts, missing evidence, and time mismatches
  - Integrity metadata (SHA-256 content hash, timestamp, schema version)
- **Serialization**: JSON (canonical) and text-based PDF export
- **Determinism**: All arrays sorted by ID, canonical JSON serialization with sorted keys
- **API Endpoints**:
  - `GET /api/corpus/:corpusId/verified-record` - JSON export
  - `GET /api/corpus/:corpusId/verified-record.pdf` - Text-based printable export
- **Purpose**: Courts, regulators, executives, and audits

### Versioning Discipline
- **schema**: Evidence Pack format (`lantern.evidence_pack.v0`, `v1`…) — changes when ZIP structure changes
- **schema_version**: DB schema version (1, 2, 3…) — changes when IndexedDB stores change
- **tool_version**: App build version (`0.1.8`…) — changes with each release

### File Structure
```
client/src/
├── context/
│   └── LensContext.tsx         # Newsroom/Legal lens provider (vault-backed)
├── lens/
│   └── semanticMap.ts          # Semantic label mappings
├── export/
│   └── templates/
│       ├── newsroom.ts         # Editor Review Packet template
│       ├── legal.ts            # Case Memorandum template
│       ├── newsroomOnePager.ts # Editor One-Pager template
│       └── legalOnePager.ts    # Counsel One-Pager template
├── pages/
│   ├── lantern-extract.tsx     # Main extraction UI with pagination (100 items/page)
│   ├── dossier-editor.tsx      # CRUD for dossier curation
│   ├── dossier-report.tsx      # Publication-ready reports with lens export modal + ZIP + verify
│   ├── dossier-comparison.tsx  # Cross-dossier analysis
│   └── how-it-works.tsx        # Evidence-first workbench documentation
├── lib/
│   ├── lanternExtract.ts       # Core extraction engine
│   ├── storage.ts              # IndexedDB persistence layer (unified DB, exports getDB)
│   ├── vault.ts                # Case-level CRUD vault (uses shared getDB)
│   ├── evidencePack.ts         # ZIP evidence pack export
│   ├── verifyPack.ts           # ZIP evidence pack hash verification
│   ├── heuristics/             # Analysis algorithms
│   └── schema/pack_v1.ts       # Dossier schema (v2)
├── workers/
│   └── extraction.worker.ts    # Web Worker for browser-side extraction
server/
├── index.ts                    # Express entrypoint
├── routes.ts                   # API endpoints for job queue and file upload
├── extractionProcessor.ts      # Server-side extraction job processor
└── storage.ts                  # MemStorage adapter for job persistence
shared/
└── schema.ts                   # Drizzle schema for extraction_jobs table
```

## External Dependencies

### UI Framework
- **React 18** with React Router for SPA routing
- **Radix UI** primitives for accessible components
- **Tailwind CSS** via @tailwindcss/vite plugin
- **shadcn/ui** component library (New York style)

### Build & Development
- **Vite** for development server and production builds
- **TypeScript** with strict mode enabled
- **tsx** for server-side TypeScript execution

### Data Validation
- **Zod** for runtime schema validation
- **drizzle-zod** for database schema integration (scaffold only)

### Database (Active - Extraction Job Queue)
- **Drizzle ORM** configured for PostgreSQL
- **extraction_jobs** table: Durable job queue with states (pending, processing, completed, failed, cancelled)
- **connect-pg-simple** for session storage

### Charting & Visualization
- **Recharts** for data visualization (referenced in attached assets)
- **Embla Carousel** for UI carousels

### Crypto
- **Web Crypto API** (`crypto.subtle`) for SHA-256 fingerprinting
- Used for pack identity, report integrity, and comparison fingerprints