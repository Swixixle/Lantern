// ... (imports)

// --- PACK IDENTITY LOGIC ---

// Helper for stable key sorting
const sortKeys = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(sortKeys);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).sort().reduce((acc, key) => {
      acc[key] = sortKeys(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
};

// Compute Stable Pack ID (Source + Content + Curation)
// Now strictly canonicalized: sorted array order, sorted keys, explicit artifact fields only.
export const computePackId = (pack: Omit<LanternPack, 'pack_id' | 'hashes'>, sourceTextSha256: string): string => {
  // Canonicalize items by ID and inclusion status
  // STRICT SORTING: Sort items by ID to ensure array order doesn't affect hash
  const signature = {
    source: sourceTextSha256,
    engine: { name: pack.engine.name, version: pack.engine.version }, // Explicit engine fields
    items: {
      entities: pack.items.entities
        .map(i => ({ id: i.id, included: i.included, tags: i.tags.sort() }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      quotes: pack.items.quotes
        .map(i => ({ id: i.id, included: i.included }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      metrics: pack.items.metrics
        .map(i => ({ id: i.id, included: i.included }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      timeline: pack.items.timeline
        .map(i => ({ id: i.id, included: i.included }))
        .sort((a, b) => a.id.localeCompare(b.id))
    }
  };
  
  // Deterministic stringify with sorted keys
  const sortedSignature = sortKeys(signature);
  const signatureStr = JSON.stringify(sortedSignature);
  const hash = mockHash(signatureStr);
  return `lex_${hash.slice(0, 16)}`;
};

// ... (Rest of file unchanged)
