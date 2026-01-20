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

// ... (existing helpers: normalizeForScore, createItemKey, scoreExtraction)

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
