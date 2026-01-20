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

// Simple precision/recall calculator
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
  // Note: This is simplified. Strictly speaking, we should count unique matches.
  // But for our fixtures, we can assume low repetition.
  // Let's reverse check for false positives
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
  common: { type: string, item: any }[];
  stats: {
    added_count: number;
    removed_count: number;
    common_count: number;
  }
};

export const diffPacks = (packA: LanternPack, packB: LanternPack): PackDiff => {
  const diff: PackDiff = {
    added: [],
    removed: [],
    common: [],
    stats: { added_count: 0, removed_count: 0, common_count: 0 }
  };

  const types = ["entities", "quotes", "metrics", "timeline"] as const;

  types.forEach(type => {
    // Map items by deterministic content hash (not ID, since ID might vary if we re-gen)
    // Actually, we should use our "canonical key" logic or just compare core fields.
    // Let's use ID for now assuming stable ID generation is working (v0.1.5).
    // If IDs are stable, we can map by ID.
    
    const mapA = new Map(packA.items[type].map((i: any) => [i.id, i]));
    const mapB = new Map(packB.items[type].map((i: any) => [i.id, i]));

    // Check items in B against A
    for (const [id, item] of mapB) {
      if (mapA.has(id)) {
        diff.common.push({ type, item });
      } else {
        diff.added.push({ type, item });
      }
    }

    // Check items in A missing from B
    for (const [id, item] of mapA) {
      if (!mapB.has(id)) {
        diff.removed.push({ type, item });
      }
    }
  });

  diff.stats.added_count = diff.added.length;
  diff.stats.removed_count = diff.removed.length;
  diff.stats.common_count = diff.common.length;

  return diff;
};
