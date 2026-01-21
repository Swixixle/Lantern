# Lantern Core Boundary

**Definition:**
"Lantern Core" is the portable, rule-based extraction engine within the application. It MUST be separable from the UI, storage layer, and React framework. It operates purely on string inputs and returns JSON outputs.

## Core File Manifest

The following files constitute the "Lantern Core" and must remain dependency-free (except for internal helpers):

### 1. Heuristics (The Brain)
*   `client/src/lib/heuristics/segmenters/sentenceSegmenter.ts` (Segmentation Rules)
*   `client/src/lib/heuristics/entities/entityExtractor.ts` (Extraction Logic)
*   `client/src/lib/heuristics/entities/entityCanonicalizer.ts` (Normalization)
*   `client/src/lib/heuristics/entities/entityTierer.ts` (Classification)
*   `client/src/lib/heuristics/metrics/metricNormalizer.ts` (Schema & Types)

### 2. Validation (The Guard)
*   `client/src/lib/lanternExtract.ts` (Orchestrator & Provenance Validation)
    *   *Note: Currently contains some orchestration logic that should ideally be split in M3, but `validateProvenance` and `extract` are the core functions.*

### 3. Helpers
*   `client/src/lib/lanternExtract.ts` (Exported helper: `mockHash`)

## Core I/O Contract

**Input:**
```typescript
(text: string, options: ExtractionOptions)
```
*   `text`: Raw source string (immutable).
*   `options`: `{ mode: "conservative" | "balanced" | "broad" }`.

**Output:**
```typescript
{
  items: LanternPack["items"], // Entities, Quotes, Metrics, Timeline
  stats: EngineStats,          // Discard counts
  stable_source_hash: string   // Hash of input text
}
```

**Artifact Contract (All Items):**
*   `id`: Stable Hash (`content:start:end`)
*   `provenance`: `{ start: number, end: number, sentence_text: string, ... }`
*   `confidence`: `number` (0.0 - 1.0)
*   `included`: `boolean`

## Prohibited Dependencies in Core

The Core module **MUST NOT** import or usage:
*   `react` / `jsx` / `tsx` (UI components)
*   `@/components/ui/*` (Shadcn/UI)
*   `window` / `document` / `localStorage` (Browser APIs)
    *   *Exception: `lanternExtract.ts` currently runs in browser, but logic should be isomorphic.*
*   `replit` specific environment variables (unless injected via config)
*   Network calls (`fetch`, `axios`) inside extraction logic (Extraction is offline/local).

## Future Architectural Goal
Isolate `client/src/lib/lanternExtract.ts` and `client/src/lib/heuristics/` into a separate package or strict module to enforce this boundary physically.
