# Phase 3 Backlog (Lantern)

The following features were explicitly **out of scope** for the v0.1.5 Baseline Freeze. Status updated as of February 2026.

## Persistence & Backend
*   [x] **SQLite/Postgres Integration**: PostgreSQL backend with 17 tables via Drizzle ORM (shared/schema.ts).
*   [x] **API Layer**: 50+ REST endpoints in server/routes.ts (auth, upload, corpus, claims, anchors, packets, snapshots, ledger, export).
*   [ ] **Multi-User Support**: Single demo API key; no user accounts or RBAC.

## Advanced Extraction
*   [ ] **Shadow NLP Engine**: Integrate LLM (Gemini/GPT) as a shadow extractor to propose items missed by heuristics.
*   [ ] **Advanced Disambiguation**: Cross-document entity linking and resolution.
*   [ ] **Graph Mapping**: Relationship extraction between entities (Subject-Verb-Object).

## Workflow Tools
*   [x] **Multi-Source Corpora**: Corpus can have multiple sources via corpus_sources table; intake page supports multi-document upload.
*   [ ] **Pack Merging**: Tools to merge two different extractions of the same source.
*   [ ] **Batch Exports**: Export multiple packs to CSV/JSON-L.
*   [ ] **Citation Generator**: Auto-generate citations from extraction provenance.
