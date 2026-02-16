# Lantern Library Storage Schema

## Storage Architecture

Lantern uses a dual-storage architecture:

1. **PostgreSQL** (server-side, authoritative) — All corpus data via Drizzle ORM
2. **IndexedDB** (client-side, local packs) — Extract and dossier packs via `idb` library

---

## Server-Side Storage (PostgreSQL)

**Connection**: `DATABASE_URL` environment variable
**ORM**: Drizzle ORM with schema defined in `shared/schema.ts`
**Adapter**: `server/storage.ts`

### Tables (17)

| Table | Purpose |
|-------|---------|
| users | User accounts |
| cases | Case management containers |
| uploads | Source documents (text, PDF) with SHA-256 content hashes |
| upload_pages | Page-level data for multi-page uploads |
| chunks | Text chunks extracted from source documents |
| extraction_jobs | Server-side extraction job queue with status tracking |
| corpora | Corpus containers grouping multiple sources |
| corpus_sources | Many-to-many source-to-corpus associations |
| anchor_records | Evidence anchors with character offsets to source text |
| claim_records | Claims with posture classification (DEFENSIBLE/RESTRICTED/AMBIGUOUS) |
| evidence_packets | Evidence packets with SHA-256 chain-of-custody |
| snapshots | Point-in-time corpus snapshots with integrity data |
| ledger_events | Append-only revision ledger with hash chains |
| pdf_pages | Rendered PDF page images (PNG) |
| constraints | CONFLICT, MISSING_EVIDENCE, TIME_MISMATCH detections |
| incident_reports | Immutable incident report artifacts |
| report_artifacts | Generated report files |

### File Storage

Uploaded files are stored in the `uploads/` directory with content-addressed filenames (SHA-256 hash prefix). PDF pages are rendered to PNG and stored in `uploads/pages/<uploadId>/page-<N>.png`.

---

## Client-Side Storage (IndexedDB)

**Library**: `idb` (IndexedDB wrapper)
**Database**: `lantern-db` (version 2)
**Module**: `client/src/lib/storage.ts`

### Pack Types

| Type | Discriminator | Schema |
|------|---------------|--------|
| Extract Pack | `schema: "lantern.extract.pack.v1"` | `LanternPack` type |
| Dossier Pack | `packId` present, `schemaVersion: 2` | `Pack` type (v2) |

### Key Behaviors

- **Immutable Snapshots**: A pack is defined by its content. Changing curation produces a new `pack_id`.
- **No Overwrites**: Saving a pack with an existing ID is a no-op (idempotent).
- **Source Grouping**: Packs are grouped in the UI by `stable_source_hash`.
- **Migration**: v1 packs auto-migrate to v2 on load; transformations logged in `pack.migrationLog[]`.

### Type Guards

```typescript
export function isExtractPack(p: AnyPack): p is LanternPack {
  return "schema" in p && p.schema === "lantern.extract.pack.v1";
}

export function isDossierPack(p: AnyPack): p is Pack {
  return "packId" in p && !("schema" in p && (p as any).schema === "lantern.extract.pack.v1");
}
```

---

## Canonicalization

To ensure stable hashing, the following are **excluded** from the `pack_id` calculation:
- UI-only state (e.g., `showDetails` flags)
- Runtime timestamps (except extraction timestamp if part of metadata)
- Order of keys in JSON objects (strictly sorted before hashing)
- Order of items in arrays (strictly sorted by Item ID before hashing)

---

## Data Flow Summary

```
Upload (Text/PDF) → POST /api/upload → PostgreSQL (uploads, chunks)
                                      → Filesystem (uploads/)
Extract (browser) → Web Worker → IndexedDB (extract pack)
Extract (server)  → POST /api/extract → PostgreSQL (extraction_jobs, anchor_records)
Corpus Build      → POST /api/corpus/:id/build → PostgreSQL (anchor_records, claim_records)
Claims/Packets    → REST API → PostgreSQL (claim_records, evidence_packets)
Ledger/Snapshots  → REST API → PostgreSQL (ledger_events, snapshots)
Export            → GET /api/corpus/:id/export_bundle → ZIP file download
```
