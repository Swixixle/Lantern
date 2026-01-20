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
  if (val === undefined || val === null) return "null"; // Explicit null string for key
  return String(val)
    .trim()
    .replace(/\s+/g, " ") // normalize space
    .replace(/[–—]/g, "-") // normalize dashes
    .replace(/,/g, "") // normalize separators (1,000 -> 1000)
    .toLowerCase(); // case insensitive is usually OK for checking *content* equivalence
};

// Generic Item Matcher (Strict Structural Keys)
const createItemKey = (item: any, type: "entities" | "quotes" | "metrics" | "timeline"): string => {
  if (type === "entities") {
    // Entities: entity|<type>|<normalized_text>
    return `entity|${item.type}|${normalizeForScore(item.text)}`;
  }
  if (type === "quotes") {
    // Quotes: quote|<normalized_text>|<speaker_or_null>
    // Speaker is part of identity per Quality Contract.
    return `quote|${normalizeForScore(item.quote)}|${normalizeForScore(item.speaker)}`;
  }
  if (type === "metrics") {
    // Metrics: metric|<kind>|<unit>|<normalized_value>
    // Value includes range bounds if range kind
    const core = `metric|${item.metric_kind}|${normalizeForScore(item.unit)}`;
    if (item.metric_kind === "range") {
      return `${core}|${normalizeForScore(item.range_low)}|${normalizeForScore(item.range_high)}`;
    }
    // For scalar/ratio/rate, use value
    // Use raw_value_text normalized because parsed_number might have rounding issues in key?
    // Actually, `normalized_value` is number. Let's use that if available, else raw.
    const valKey = item.normalized_value !== undefined ? item.normalized_value : item.value;
    return `${core}|${normalizeForScore(valKey)}`;
  }
  if (type === "timeline") {
    // Timeline: time|<date_type>|<raw_date_text>
    return `time|${item.date_type}|${normalizeForScore(item.date)}`;
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
    // Map items by SEMANTIC KEY (Identity)
    // packA = Current, packB = Base/Saved
    
    const mapA = new Map(); // Key -> Item
    packA.items[type].forEach((i: any) => mapA.set(createItemKey(i, type), i));
    
    const mapB = new Map();
    packB.items[type].forEach((i: any) => mapB.set(createItemKey(i, type), i));

    // Check items in A (Current)
    for (const [key, itemA] of mapA) {
      if (mapB.has(key)) {
        // Identity exists in both. Check attributes/content details.
        const itemB = mapB.get(key);
        
        // Content Check: Compare JSON excluding key-defining fields to find "Changed"
        // Actually, simpler: compare full JSON string. If diff, it's a Change.
        // Since key is same, the identity is same.
        // We exclude 'id' from comparison because ID generation might vary if we changed algos (though v0.1.5 is stable).
        // We exclude 'provenance' if we want "Changed" to capture offset shifts. 
        // User says: "Changed triggers when... tracked attributes differ (provenance, confidence)".
        // So we include provenance in the check.
        
        const contentA = JSON.stringify({ ...itemA, id: null });
        const contentB = JSON.stringify({ ...itemB, id: null });
        
        if (contentA === contentB) {
            diff.common.push({ type, item: itemA });
        } else {
            diff.changed.push({ type, from: itemB, to: itemA });
        }
      } else {
        // Key in A, not in B -> Added
        diff.added.push({ type, item: itemA });
      }
    }

    // Check items in B (Base) missing from A (Current)
    for (const [key, itemB] of mapB) {
      if (!mapA.has(key)) {
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
