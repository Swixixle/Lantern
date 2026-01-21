import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// --- TYPES ---

export type Provenance = {
  start: number;
  end: number;
  sentence: string;
};

export type BaseItem = {
  id: string;
  provenance: Provenance;
  confidence: number;
  included: boolean;
};

export type EntityItem = BaseItem & {
  text: string;
  type: "Person" | "Organization" | "Location" | "Event" | "Product";
  canonical_family_id?: string;
};

export type QuoteItem = BaseItem & {
  quote: string;
  speaker: string | null;
  speaker_candidates?: string[];
};

export type MetricItem = BaseItem & {
  value: string;
  unit: string;
  metric_kind: "scalar" | "range" | "ratio" | "rate";
  range_low?: number;
  range_high?: number;
  normalized_value?: number;
  qualifier?: string;
  parse_notes?: string;
};

export type TimelineItem = BaseItem & {
  date: string;
  date_type: "explicit" | "relative";
  event: string;
};

export type EngineStats = {
  duplicates_collapsed: number;
  invalid_dropped: number;
  headlines_suppressed: number;
};

export type LanternPack = {
  pack_id: string;
  schema: string;
  hashes: {
    source_text_sha256: string;
    pack_sha256: string;
  };
  engine: {
    name: string;
    version: string;
  };
  source: {
    title: string;
    author: string;
    publisher: string;
    url: string;
    published_at: string;
    retrieved_at: string;
    source_type: string;
  };
  items: {
    entities: EntityItem[];
    quotes: QuoteItem[];
    metrics: MetricItem[];
    timeline: TimelineItem[];
  };
  stats: EngineStats;
};

export type ExtractionOptions = {
  mode: "conservative" | "balanced" | "broad";
};

// --- HELPERS ---

export const mockHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
};

export const computePackId = (pack: Omit<LanternPack, "pack_id" | "hashes"> | any, sourceHash: string): string => {
  // Deterministic ID based on content
  const content = JSON.stringify({
    source: pack.source,
    engine: pack.engine,
    items: pack.items
  });
  return mockHash(content + sourceHash);
};

export const normalizeForScore = (val: string | number | undefined): string => {
  if (val === undefined || val === null) return "null"; 
  return String(val)
    .trim()
    .replace(/\s+/g, " ") 
    .replace(/[–—]/g, "-") 
    .replace(/,/g, "") 
    .toLowerCase();
};

export const createItemKey = (item: any, type: "entities" | "quotes" | "metrics" | "timeline"): string => {
  if (type === "entities") {
    return `entity|${item.type}|${normalizeForScore(item.text)}`;
  }
  if (type === "quotes") {
    return `quote|${normalizeForScore(item.quote)}|${normalizeForScore(item.speaker)}`;
  }
  if (type === "metrics") {
    const core = `metric|${item.metric_kind}|${normalizeForScore(item.unit)}`;
    if (item.metric_kind === "range") {
      return `${core}|${normalizeForScore(item.range_low)}|${normalizeForScore(item.range_high)}`;
    }
    const valKey = item.normalized_value !== undefined ? item.normalized_value : item.value;
    return `${core}|${normalizeForScore(valKey)}`;
  }
  if (type === "timeline") {
    return `time|${item.date_type}|${normalizeForScore(item.date)}`;
  }
  return item.id;
};

// --- EXTRACTION LOGIC (MOCK) ---

export const extract = (text: string, options: ExtractionOptions): { items: LanternPack["items"], stats: EngineStats, stable_source_hash: string } => {
  const stable_source_hash = mockHash(text);
  const items: LanternPack["items"] = {
    entities: [],
    quotes: [],
    metrics: [],
    timeline: []
  };
  const stats: EngineStats = {
    duplicates_collapsed: 0,
    invalid_dropped: 0,
    headlines_suppressed: 0
  };

  if (!text) return { items, stats, stable_source_hash };

  // Simple Regex Heuristics for Mockup
  
  // Entities (Capitalized Words)
  const entityRegex = /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g;
  let match;
  while ((match = entityRegex.exec(text)) !== null) {
    const word = match[0];
    // Filter out common stopwords if needed
    if (word.length > 3 && !["The", "This", "That"].includes(word)) {
         items.entities.push({
            id: mockHash(`entity-${word}-${match.index}`),
            provenance: { start: match.index, end: match.index + word.length, sentence: text.slice(Math.max(0, match.index - 20), Math.min(text.length, match.index + word.length + 20)) },
            confidence: 0.9,
            included: true,
            text: word,
            type: "Organization" // Mock type
         });
    }
  }

  // Quotes ("...")
  const quoteRegex = /"([^"]+)"/g;
  while ((match = quoteRegex.exec(text)) !== null) {
      items.quotes.push({
          id: mockHash(`quote-${match.index}`),
          provenance: { start: match.index, end: match.index + match[0].length, sentence: text.slice(Math.max(0, match.index - 20), Math.min(text.length, match.index + match[0].length + 20)) },
          confidence: 0.85,
          included: true,
          quote: match[1],
          speaker: null, // Basic mock doesn't attribute
      });
  }

  // Metrics (Numbers + Units)
  const metricRegex = /(\d+(?:,\d{3})*(?:\.\d+)?)\s?(million|billion|trillion|%|USD|EUR|items|users)/gi;
  while ((match = metricRegex.exec(text)) !== null) {
      items.metrics.push({
          id: mockHash(`metric-${match.index}`),
          provenance: { start: match.index, end: match.index + match[0].length, sentence: text.slice(Math.max(0, match.index - 20), Math.min(text.length, match.index + match[0].length + 20)) },
          confidence: 0.95,
          included: true,
          value: match[1],
          unit: match[2],
          metric_kind: "scalar",
          normalized_value: parseFloat(match[1].replace(/,/g, ""))
      });
  }

  // Timeline (Dates)
  const dateRegex = /(January|February|March|April|May|June|July|August|September|October|November|December)\s\d{1,2},?\s\d{4}/g;
  while ((match = dateRegex.exec(text)) !== null) {
      items.timeline.push({
          id: mockHash(`time-${match.index}`),
          provenance: { start: match.index, end: match.index + match[0].length, sentence: text.slice(Math.max(0, match.index - 20), Math.min(text.length, match.index + match[0].length + 20)) },
          confidence: 0.9,
          included: true,
          date: match[0],
          date_type: "explicit",
          event: "Event inferred from context"
      });
  }

  // Simple dedupe mock
  const uniqueEntities = new Map();
  items.entities.forEach(e => {
      const key = createItemKey(e, "entities");
      if (!uniqueEntities.has(key)) uniqueEntities.set(key, e);
      else stats.duplicates_collapsed++;
  });
  items.entities = Array.from(uniqueEntities.values());

  return { items, stats, stable_source_hash };
};

// --- QUALITY SCORING ---

export type QualityReport = {
  fixture_id: string;
  score: number;
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

export const scoreExtraction = (
  actualItems: any[],
  expectedItems: any[],
  matchFn: (a: any, b: any) => boolean
): QualityReport["details"] & { metrics: QualityReport["metrics"] } => {
  let matches = 0;
  for (const expected of expectedItems) {
    if (actualItems.some(actual => matchFn(actual, expected))) {
      matches++;
    }
  }
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
  changed: { type: string, from: any, to: any }[]; 
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
    const mapA = new Map();
    packA.items[type].forEach((i: any) => mapA.set(createItemKey(i, type), i));
    
    const mapB = new Map();
    packB.items[type].forEach((i: any) => mapB.set(createItemKey(i, type), i));

    for (const [key, itemA] of mapA) {
      if (mapB.has(key)) {
        const itemB = mapB.get(key);
        const contentA = JSON.stringify({ ...itemA, id: null });
        const contentB = JSON.stringify({ ...itemB, id: null });
        
        if (contentA === contentB) {
            diff.common.push({ type, item: itemA });
        } else {
            diff.changed.push({ type, from: itemB, to: itemA });
        }
      } else {
        diff.added.push({ type, item: itemA });
      }
    }

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
