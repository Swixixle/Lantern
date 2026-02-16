# Lantern - Investigative Intelligence Platform

## Overview

Lantern is an institutional-grade investigative journalism claim governance platform. It enables analysts to create corpora from uploaded documents with provenance tracking, extract evidence, author claims with evidence packets, and verify integrity through append-only ledgers. The platform generates "Verified Records" as deterministic output artifacts suitable for legal and auditing purposes. Its core principle is "No source, no assertion," ensuring all claims are evidence-bound and audit-ready.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application is a full-stack hybrid system. The frontend is a React 18, Vite, and TypeScript SPA utilizing IndexedDB for client-side storage. The backend is an Express server with over 50 API endpoints and PostgreSQL as the primary database, managed by Drizzle ORM. Document extraction occurs via a browser Web Worker for smaller documents and a PostgreSQL-backed job queue for larger ones.

**Key Architectural Decisions:**
- **Full-Stack Hybrid:** Combines a powerful React frontend with a robust Express/PostgreSQL backend.
- **Data Integrity:** Employs SHA-256 provenance for all documents and evidence, append-only ledgers, and deterministic output artifacts (Verified Records).
- **Scalable Extraction:** Utilizes both client-side Web Workers and server-side job queues to handle varying document sizes efficiently.
- **API Key Authentication:** Secures API access, supporting a read-only review mode for external stakeholders.
- **Semantic Lenses:** Provides adaptable terminology (e.g., "Newsroom" vs. "Legal") for claims and reports without altering underlying data.
- **Hard Invariants:** Enforces strict rules for determinism, offset-based data validity, stable IDs, and binary import policies to maintain data integrity and consistency.
- **Posture System:** Categorizes corpus readiness (e.g., DRAFT, HIGH_RISK, EVIDENCE_STRONG) based on claim count and evidence coverage.
- **UI/UX:** Built with React, Radix UI, Tailwind CSS, and shadcn/ui (New York style) for a modern and accessible interface.

**Core Data Model:**
The system manages two primary pack types:
- **Extract Packs:** Machine-extracted, provenance-heavy input artifacts.
- **Dossier Packs:** Curated, claim-bearing output artifacts.

**Entity Classification Guards:**
- `entityGuards.ts` contains 100+ PERSON_STOPWORDS (legal/document terms like "Evidence", "Statement", "Agreement") to prevent misclassification as Person entities.
- `shouldBlockPersonCandidate()` integrated into `entitySanitizer.ts` `classifyEntityType()` - blocked candidates get EntityClass "Concept" with `included: false`, `blocked: true`.
- Extraction view supports Aggregated/Raw toggle: aggregated deduplicates by normalized text+type, shows mention count (Nx), confidence range, top excerpts; raw shows all mentions with BLOCKED badges.

**Curation Actions:**
- Dossier editor entity cards have hover-revealed Reclassify (type dropdown), Merge (EntityCombobox target picker), and Block buttons.
- All actions persist to `pack.curationActions` array (type, entityId, fromType, toType, sourceId, targetId, timestamp, actor) for audit trail and export.

**Evidence Pack Export (9 files):**
- MANIFEST.json, DOSSIER.md, ONE_PAGER.md, CLAIMS.json, SOURCES.json, ENTITIES.json (aggregated curated entities with mention counts), CURATION.json (curation action log), APP.json, plus optional RAW_APPENDIX.json (checkbox toggle in export modal).
- All files SHA-256 hashed in manifest; verification via `verifyPack.ts` iterates manifest entries dynamically.

**Court-Safe Language:**
- Legal lens exports use precise classification labels: "Supported by excerpt(s)", "Unsubstantiated within provided corpus", "Disputed / Ambiguous support".
- IMPORTANT NOTICE disclaimer at top of legal exports.
- Curated Entity Index section in legal template.
- Unsourced claims annotated with reason (no bound excerpt / conflicting sources / ambiguous support).

**Heuristics System:**
Includes analytical algorithms such as Influence Hubs (degree centrality), Funding Gravity (monetary flow), Enforcement Map (coercive edge detection), and an Entity Sanitizer for data analysis and refinement.

## External Dependencies

- **UI Frameworks:** React 18, wouter, Radix UI, Tailwind CSS, shadcn/ui, @tanstack/react-query, lucide-react.
- **Build & Development:** Vite, TypeScript, tsx.
- **Data Validation:** Zod, drizzle-zod.
- **Database:** PostgreSQL (via Drizzle ORM), @neondatabase/serverless, connect-pg-simple.
- **Cryptography:** Web Crypto API (`crypto.subtle`), Node.js crypto (for SHA-256 hashing).
- **File Processing:** pdf-parse, pdf-poppler, multer, jszip.