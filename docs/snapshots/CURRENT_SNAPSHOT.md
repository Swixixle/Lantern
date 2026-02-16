# Nikodemus System Snapshot

Generated: 2026-02-16
Branch: main

---

## Framework & Runtime

- **Runtime**: Node.js (tsx for dev, node for prod)
- **Frontend**: React 19 + Vite + TypeScript
- **Backend**: Express 5 with 50+ REST API endpoints
- **Database**: PostgreSQL with Drizzle ORM (17 tables)
- **Client Storage**: IndexedDB via idb (local pack storage)
- **Build**: Vite (client) + esbuild (server)
- **Authentication**: API key via x-api-key header

---

## Repository Structure

```
./AUDIT_REPORT.md
./BOOK_OF_FIXES.md
./CHANGELOG.md
./LANTERN_CORE_BOUNDARY.md
./LANTERN_SYSTEM_SNAPSHOT.md
./M2_SUMMARY.md
./PRODUCT_PLAN.md
./README.md
./SYSTEM_MAP.md
./UX_GOVERNANCE.md
./client/src/App.tsx
./client/src/main.tsx
./client/src/components/AssumptionsForm.tsx
./client/src/components/CashflowChart.tsx
./client/src/components/copy-id.tsx
./client/src/components/FlightPlanTable.tsx
./client/src/components/GapChart.tsx
./client/src/components/SavingsChart.tsx
./client/src/components/SovereigntyChart.tsx
./client/src/components/Stage1Checklist.tsx
./client/src/components/TutorialOverlay.tsx
./client/src/components/UploadDrawer.tsx
./client/src/components/ui/*.tsx
./client/src/context/LensContext.tsx
./client/src/export/templates/legal.ts
./client/src/export/templates/legalOnePager.ts
./client/src/export/templates/newsroom.ts
./client/src/export/templates/newsroomOnePager.ts
./client/src/fixtures/advanced_tests.json
./client/src/fixtures/basic_test.json
./client/src/fixtures/metric_and_attribution_edge_cases.json
./client/src/hooks/use-mobile.tsx
./client/src/hooks/use-toast.ts
./client/src/lens/semanticMap.ts
./client/src/lib/auth.tsx
./client/src/lib/comparison-export.ts
./client/src/lib/comparison.ts
./client/src/lib/config.tsx
./client/src/lib/converters/extract_to_dossier.ts
./client/src/lib/defaultRamps.ts
./client/src/lib/evidencePack.ts
./client/src/lib/export.ts
./client/src/lib/integrity.ts
./client/src/lib/lanternExtract.ts
./client/src/lib/migrations.ts
./client/src/lib/posture.ts
./client/src/lib/queryClient.ts
./client/src/lib/schema/anchors.ts
./client/src/lib/schema/claims.ts
./client/src/lib/schema/constraints.ts
./client/src/lib/schema/corpus.ts
./client/src/lib/schema/pack_v1.ts
./client/src/lib/schema/provenance.ts
./client/src/lib/sovereigntyEngine.ts
./client/src/lib/storage.ts
./client/src/lib/tutorial.tsx
./client/src/lib/utils.ts
./client/src/lib/vault.ts
./client/src/lib/verifyPack.ts
./client/src/lib/heuristics/enforcementMap.ts
./client/src/lib/heuristics/entities/entityCanonicalizer.ts
./client/src/lib/heuristics/entities/entityExtractor.ts
./client/src/lib/heuristics/entities/entitySanitizer.ts
./client/src/lib/heuristics/entities/entityTierer.ts
./client/src/lib/heuristics/fundingGravity.ts
./client/src/lib/heuristics/influenceHubs.ts
./client/src/lib/heuristics/metrics/metricNormalizer.ts
./client/src/lib/heuristics/segmenters/sentenceSegmenter.ts
./client/src/lib/heuristics/sensitivity.ts
./client/src/lib/heuristics/types.ts
./client/src/lib/llm/contract.ts
./client/src/lib/tests/integration/m3_3_proof.test.ts
./client/src/lib/tests/unit/converter.test.ts
./client/src/lib/tests/unit/entityExtractor.test.ts
./client/src/lib/tests/unit/guardrails.test.ts
./client/src/lib/tests/unit/heuristics/enforcement.test.ts
./client/src/lib/tests/unit/heuristics/funding.test.ts
./client/src/lib/tests/unit/heuristics/influence.test.ts
./client/src/lib/tests/unit/importDedupe.test.ts
./client/src/lib/tests/unit/integrity.test.ts
./client/src/lib/tests/unit/migrations.test.ts
./client/src/lib/tests/unit/persistence.test.ts
./client/src/lib/tests/unit/provenance.test.ts
./client/src/lib/tests/unit/v1PackMigration.test.ts
./client/src/pages/anchor-browser.tsx
./client/src/pages/anchor-proof.tsx
./client/src/pages/anchor-view.tsx
./client/src/pages/cases.tsx
./client/src/pages/claim-space.tsx
./client/src/pages/constraints.tsx
./client/src/pages/dashboard.tsx
./client/src/pages/dossier-comparison.tsx
./client/src/pages/dossier-editor.tsx
./client/src/pages/dossier-report.tsx
./client/src/pages/evidence-packet.tsx
./client/src/pages/how-it-works.tsx
./client/src/pages/incident-report.tsx
./client/src/pages/intake.tsx
./client/src/pages/lantern-core.tsx
./client/src/pages/lantern-extract.tsx
./client/src/pages/ledger.tsx
./client/src/pages/library.tsx
./client/src/pages/not-found.tsx
./client/src/pages/review-audit-lines.tsx
./client/src/pages/review-bundle.tsx
./client/src/pages/review.tsx
./client/src/pages/snapshot-detail.tsx
./client/src/pages/snapshots.tsx
./client/src/pages/sources.tsx
./client/src/pages/verified-record.tsx
./client/src/scripts/test-extract.ts
./client/src/scripts/test-provenance.ts
./client/src/scripts/test-segmenter.ts
./client/src/workers/extraction.worker.ts
./components.json
./demos/evidence-walkthrough/evidence.json
./demos/evidence-walkthrough/interpretation.md
./demos/evidence-walkthrough/README.md
./docs/GOVERNANCE_AUDIT_2026_01_23.md
./docs/investor/01_NARRATIVE.md
./docs/investor/02_DECK_OUTLINE.md
./docs/investor/03_DEMO_SCRIPT.md
./docs/investor/04_NARRATIVE_GOVERNANCE.md
./docs/investor/05_DECK_OUTLINE_GOVERNANCE.md
./docs/investor/06_DEMO_SCRIPT_GOVERNANCE.md
./docs/investor/07_STRESS_TEST_QA.md
./docs/snapshots/CURRENT_SNAPSHOT.md
./docs/snapshots/SNAPSHOT_POLICY.md
./drizzle.config.ts
./package.json
./script/build.ts
./script/generate-snapshot.ts
./script/smoke_test.ts
./server/extractionProcessor.ts
./server/incidentReportGenerator.ts
./server/index.ts
./server/pdfProcessor.ts
./server/routes.ts
./server/static.ts
./server/storage.ts
./server/verifiedRecordGenerator.ts
./server/vite.ts
./shared/bundleVerify.ts
./shared/incidentReport.ts
./shared/ledger.ts
./shared/schema.ts
./shared/verifiedRecord.ts
./tools/verifier_package.json
./tools/verifier_package_lock.json
./tools/verify_bundle.ts
./tools/verify_bundle_standalone.cjs
./tsconfig.json
./vite.config.ts
./vite-plugin-meta-images.ts
```

---

## API Routes (50+)

### Authentication
- `GET /api/auth/status`
- `GET /api/auth/demo-key`

### Configuration
- `GET /api/config`

### Review (Read-Only)
- `GET /api/review/:corpusId/bundle`
- `GET /api/review/:corpusId/audit_lines`

### Upload
- `POST /api/upload`
- `POST /api/upload/pdf`

### Cases
- `GET /api/cases`
- `POST /api/cases`
- `GET /api/cases/:caseId`
- `PUT /api/cases/:caseId`
- `DELETE /api/cases/:caseId`
- `GET /api/cases/:caseId/uploads`

### Extraction
- `POST /api/extract`
- `GET /api/jobs/:jobId`

### Corpora
- `GET /api/corpus`
- `POST /api/corpus`
- `GET /api/corpus/:corpusId`
- `POST /api/corpus/:corpusId/sources`
- `POST /api/corpus/:corpusId/build`

### Claims
- `GET /api/corpus/:corpusId/claims`
- `POST /api/corpus/:corpusId/claims`
- `PUT /api/corpus/:corpusId/claims/:claimId`
- `DELETE /api/corpus/:corpusId/claims/:claimId`
- `POST /api/corpus/:corpusId/claims/:claimId/packet`

### Anchors
- `GET /api/anchors`
- `GET /api/corpus/:corpusId/anchors`
- `GET /api/anchors/:anchorId/proof`

### Sources
- `GET /api/sources/:sourceId/pages/:pageIndex`

### Packets
- `GET /api/packets/:packetId`
- `GET /api/packets/:packetId.pdf`
- `GET /api/packets/:packetId/verify`
- `GET /api/packets/:packetId/verify_chain`

### Constraints
- `GET /api/constraints`

### Snapshots
- `POST /api/snapshots`
- `GET /api/corpus/:corpusId/snapshots`
- `GET /api/snapshots/:snapshotId`
- `GET /api/snapshots/:snapshotId/verify`

### Ledger
- `GET /api/corpus/:corpusId/ledger`
- `GET /api/ledger/:eventId/verify`

### Export
- `GET /api/corpus/:corpusId/export_bundle`
- `GET /api/corpus/:corpusId/export_repro_pack`

### Health
- `GET /__boot`
- `GET /__health`

---

## Client Pages (24)

- anchor-browser
- anchor-proof
- anchor-view
- cases
- claim-space (primary view, `/`)
- constraints
- dashboard (legacy)
- dossier-comparison
- dossier-editor
- dossier-report
- evidence-packet
- how-it-works
- incident-report
- intake
- lantern-core
- lantern-extract
- ledger
- library
- not-found
- review
- review-audit-lines
- review-bundle
- snapshot-detail
- snapshots
- sources
- verified-record

---

## Database Tables (17)

- users
- cases
- uploads
- upload_pages
- chunks
- extraction_jobs
- corpora
- corpus_sources
- anchor_records
- claim_records
- evidence_packets
- snapshots
- ledger_events
- pdf_pages
- constraints
- incident_reports
- report_artifacts

---

## Heuristic Entrypoints

- heuristics/enforcementMap.ts
- heuristics/entities/entityCanonicalizer.ts
- heuristics/entities/entityExtractor.ts
- heuristics/entities/entitySanitizer.ts
- heuristics/entities/entityTierer.ts
- heuristics/fundingGravity.ts
- heuristics/influenceHubs.ts
- heuristics/metrics/metricNormalizer.ts
- heuristics/segmenters/sentenceSegmenter.ts
- heuristics/sensitivity.ts
- heuristics/types.ts

---

## Schema Definitions

- client/src/lib/schema/pack_v1.ts
- client/src/lib/schema/anchors.ts
- client/src/lib/schema/claims.ts
- client/src/lib/schema/constraints.ts
- client/src/lib/schema/corpus.ts
- client/src/lib/schema/provenance.ts
- shared/schema.ts (Drizzle ORM, 17 tables)
- shared/ledger.ts
- shared/verifiedRecord.ts
- shared/incidentReport.ts
- shared/bundleVerify.ts

---

## Server Modules

- server/routes.ts — 50+ API endpoints
- server/storage.ts — PostgreSQL storage adapter (Drizzle ORM)
- server/extractionProcessor.ts — Server-side extraction job queue
- server/pdfProcessor.ts — PDF upload and page rendering
- server/incidentReportGenerator.ts — Incident report generation
- server/verifiedRecordGenerator.ts — Verified record generation
- server/static.ts — Static file serving
- server/vite.ts — Vite dev middleware

---

## Governance Documents

- UX_GOVERNANCE.md
- SYSTEM_MAP.md
- LANTERN_CORE_BOUNDARY.md
- LANTERN_SYSTEM_SNAPSHOT.md
- AUDIT_REPORT.md
- PRODUCT_PLAN.md
- docs/investor/*.md
- docs/GOVERNANCE_AUDIT_2026_01_23.md

---

## Excluded from Snapshot (Security)

The following are explicitly excluded:
- `attached_assets/` — User uploads, potentially sensitive
- `.local/` — Local state, may contain tokens
- `.cache/` — Build cache
- `node_modules/` — Dependencies (use package.json)
- `dist/` — Build output
- `.git/` — Git internals
- `.env`, `.env.*` — Environment variables/secrets
- `uploads/` — Uploaded corpus files and rendered pages

---

## Verification

To regenerate:
```bash
npx tsx script/generate-snapshot.ts
```

---

*This snapshot is safe for external review. It contains structure and wiring only — no secrets, protected parameters, or Canon content.*
