// ... (imports)

// ... (existing types: Provenance, BaseItem, EntityItem, QuoteItem, MetricItem, TimelineItem, EngineStats, LanternPack, ExtractionOptions)

// ... (existing helpers: normalizeEntity, mockHash, generateFamilyId, normalizeQuote, normalizeMetric, splitSentences, validateItem, sortKeys, computePackId, extract)

// --- QUALITY SCORING LOGIC ---

export type QualityReport = {
  fixture_id: string;
  score: number; // 0-1
  metrics: {
    precision: number;
    recall: number;
    f1: number;
  };
  details: {
    expected: number;
    actual: number;
    matches: number;
    false_positives: number;
    false_negatives: number;
  };
  failures: string[];
};

// HELPER: Constrained normalization for scoring
// We do NOT want to fuzzy match everything. We want to be strict on units, types, etc.
// But we allow minor punctuation variances (hyphen vs en dash) or spacing.
const normalizeForScore = (val: string | number | undefined): string => {
  if (val === undefined || val === null) return "";
  return String(val)
    .trim()
    .replace(/\s+/g, " ") // normalize space
    .replace(/[–—]/g, "-") // normalize dashes
    .toLowerCase(); // case insensitive is usually OK for checking *content* equivalence
};

// Generic Item Matcher (Strict Structural Keys)
const createItemKey = (item: any, type: "entities" | "quotes" | "metrics" | "timeline"): string => {
  if (type === "entities") {
    // Entities: Type + Text
    return `${item.type}|${normalizeForScore(item.text)}`;
  }
  if (type === "quotes") {
    // Quotes: Speaker (if known) + Quote Text
    // Note: Speaker is optional in fixtures, but if present in expected, it must match.
    // If extraction has speaker and expected doesn't, that's a pass on speaker (or we ignore it).
    // Let's rely on the matcher function for partials, but here we need a key for strict diff.
    return `${normalizeForScore(item.speaker)}|${normalizeForScore(item.quote)}`;
  }
  if (type === "metrics") {
    // Metrics: Kind + Unit + Value (normalized) + Range Bounds
    // This is the critical one. We MUST match unit and kind strictly.
    const core = `${item.metric_kind}|${normalizeForScore(item.unit)}`;
    if (item.metric_kind === "range") {
      return `${core}|${item.range_low}|${item.range_high}`;
    }
    // For scalar/ratio/rate, we use the value string but maybe normalized?
    // Actually, extracted items have `value` (raw text). We should ideally match on `normalized_value` if present,
    // but our fixtures define expected "value" as a string. 
    // Let's use the fixture's approach: we expect the extraction logic to have produced
    // a `value` string that roughly matches the input text span.
    return `${core}|${normalizeForScore(item.value)}`;
  }
  if (type === "timeline") {
    return `${item.date_type}|${normalizeForScore(item.date)}`;
  }
  return item.id;
};

// Refactored Scorer: Structural Matching
export const scoreExtraction = (
  actualItems: any[],
  expectedItems: any[],
  matchFn: (a: any, b: any) => boolean
): QualityReport["details"] & { metrics: QualityReport["metrics"] } => {
  let matches = 0;
  
  // Recall: For every expected item, did we find it?
  for (const expected of expectedItems) {
    if (actualItems.some(actual => matchFn(actual, expected))) {
      matches++;
    }
  }
  
  // Precision: For every actual item, was it expected?
  let validActuals = 0;
  for (const actual of actualItems) {
    if (expectedItems.some(expected => matchFn(actual, expected))) {
      validActuals++;
    }
  }

  const false_negatives = expectedItems.length - matches;
  const false_positives = actualItems.length - validActuals;

  const precision = actualItems.length > 0 ? validActuals / actualItems.length : 1;
  const recall = expectedItems.length > 0 ? matches / expectedItems.length : 1;
  const f1 = (precision + recall) > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

  return {
    expected: expectedItems.length,
    actual: actualItems.length,
    matches,
    false_positives,
    false_negatives,
    metrics: { precision, recall, f1 }
  };
};

// --- DIFF LOGIC ---

export type PackDiff = {
  added: { type: string, item: any }[];
  removed: { type: string, item: any }[];
  changed: { type: string, from: any, to: any }[]; // New Category
  common: { type: string, item: any }[];
  stats: {
    added_count: number;
    removed_count: number;
    changed_count: number;
    common_count: number;
  }
};

export const diffPacks = (packA: LanternPack, packB: LanternPack): PackDiff => {
  const diff: PackDiff = {
    added: [],
    removed: [],
    changed: [],
    common: [],
    stats: { added_count: 0, removed_count: 0, changed_count: 0, common_count: 0 }
  };

  const types = ["entities", "quotes", "metrics", "timeline"] as const;

  types.forEach(type => {
    // Map items by ID first (Stable ID assumption)
    const mapA = new Map(packA.items[type].map((i: any) => [i.id, i]));
    const mapB = new Map(packB.items[type].map((i: any) => [i.id, i]));

    // Check items in B (Target/Loaded) against A (Current)
    // NOTE: Usually diff is "Changes from A to B".
    // If A is "Base" (Saved) and B is "Current" (New), we want:
    // Added = present in B, not in A
    // Removed = present in A, not in B
    // Changed = present in both, but content differs
    
    // Let's assume input: (Base, New)
    // Actually, usually we compare Current (A) vs Saved (B). 
    // If I want to see "What changed in Current vs Saved", then:
    // Added = in Current (A) but not Saved (B) -> if mapA has, mapB doesn't
    // Removed = in Saved (B) but not Current (A) -> if mapB has, mapA doesn't
    
    // Let's standardize: diffPacks(base, current)
    // So base=packB (saved), current=packA (live)
    // But function signature is (packA, packB). Let's treat packA as Current, packB as Base.
    // So:
    // Added: In A, not B
    // Removed: In B, not A
    
    for (const [id, itemA] of mapA) {
      if (mapB.has(id)) {
        // ID exists in both. Check content.
        const itemB = mapB.get(id);
        
        // Content Check: compare structural keys
        const keyA = createItemKey(itemA, type);
        const keyB = createItemKey(itemB, type);
        
        // Also check specific fields that might change even if key is stable-ish
        // e.g. speaker candidates, range bounds (if not in key), included status
        // Inclusion status is part of ID logic (v0.1.5), so if inclusion changes, ID changes!
        // So we don't need to check inclusion here if we rely on IDs.
        // Wait, if inclusion changes, ID changes => then it shows as Remove + Add.
        // This is correct behavior for "Snapshot" logic.
        // What if we have "Same content, different attribute" that DOESN'T change ID?
        // In v0.1.5, Pack ID depends on Items. Item ID depends on Content + Start Offset.
        // If content changes (e.g. text normalization tweak), ID changes.
        // So "Changed" category is rare with Content-Addressed IDs unless we have non-ID fields.
        // Non-ID fields: maybe confidence? tags?
        // Let's compare JSON string of the item excluding 'id' and 'provenance' to be safe.
        
        const contentA = JSON.stringify({ ...itemA, id: null, provenance: null });
        const contentB = JSON.stringify({ ...itemB, id: null, provenance: null });
        
        if (contentA === contentB) {
            diff.common.push({ type, item: itemA });
        } else {
            diff.changed.push({ type, from: itemB, to: itemA });
        }
      } else {
        diff.added.push({ type, item: itemA });
      }
    }

    // Check items in B (Base) missing from A (Current)
    for (const [id, itemB] of mapB) {
      if (!mapA.has(id)) {
        diff.removed.push({ type, item: itemB });
      }
    }
  });

  diff.stats.added_count = diff.added.length;
  diff.stats.removed_count = diff.removed.length;
  diff.stats.changed_count = diff.changed.length;
  diff.stats.common_count = diff.common.length;

  return diff;
};
