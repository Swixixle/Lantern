# Lantern - Investigative Intelligence Platform

## Overview

Lantern is a client-side investigative journalism intelligence platform that enables analysts to:
1. Extract structured data from unstructured text (entities, quotes, metrics, timeline events)
2. Curate dossiers with entities, edges, claims, and evidence
3. Apply "Shadow-Caste" heuristics to detect structural patterns (influence hubs, funding flows, enforcement actions)
4. Generate publication-ready reports with cryptographic integrity fingerprints

The application is a **client-heavy hybrid** architecture. While a full-stack scaffold exists (Express server, Drizzle ORM), all active application logic runs in the browser. Data persists to localStorage/IndexedDB, with no active backend API endpoints.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Runtime Architecture
- **Frontend**: React + Vite + TypeScript single-page application
- **Storage**: IndexedDB via `idb` library (local-first architecture)
- **Server**: Express server acts only as static asset host; `routes.ts` contains no active endpoints
- **No External Calls**: Zero network calls for data transmission; operates as an isolated local tool

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

### File Structure
```
client/src/
├── pages/
│   ├── lantern-extract.tsx    # Main extraction UI
│   ├── dossier-editor.tsx     # CRUD for dossier curation
│   ├── dossier-report.tsx     # Publication-ready reports
│   └── dossier-comparison.tsx # Cross-dossier analysis
├── lib/
│   ├── lanternExtract.ts      # Core extraction engine
│   ├── storage.ts             # Persistence layer
│   ├── heuristics/            # Analysis algorithms
│   └── schema/pack_v1.ts      # Dossier schema (v2)
server/
├── index.ts                   # Express entrypoint (static host only)
├── routes.ts                  # Empty API placeholder
└── storage.ts                 # Unused MemStorage adapter
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

### Database (Scaffold - Not Active)
- **Drizzle ORM** configured for PostgreSQL
- **connect-pg-simple** for session storage
- Schema defined in `shared/schema.ts` but unused by frontend

### Charting & Visualization
- **Recharts** for data visualization (referenced in attached assets)
- **Embla Carousel** for UI carousels

### Crypto
- **Web Crypto API** (`crypto.subtle`) for SHA-256 fingerprinting
- Used for pack identity, report integrity, and comparison fingerprints