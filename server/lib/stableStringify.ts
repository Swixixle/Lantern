/**
 * Canonical JSON serialization for deterministic hashing.
 * 
 * Produces stable, repeatable JSON output by:
 * - Sorting object keys deterministically
 * - Rejecting undefined values
 * - Maintaining consistent formatting
 * 
 * This ensures the same data structure always produces the same hash.
 */

/**
 * Canonically serialize a value to JSON string.
 * 
 * @param value - The value to serialize (must not contain undefined)
 * @returns Canonical JSON string with sorted keys
 * @throws Error if value contains undefined
 */
export function stableStringify(value: any): string {
  // Reject undefined at top level
  if (value === undefined) {
    throw new Error("Cannot stringify undefined");
  }
  
  return JSON.stringify(value, (key, val) => {
    // Reject undefined values in objects
    if (val === undefined) {
      throw new Error(`Cannot stringify object with undefined value at key: ${key}`);
    }
    
    // Sort object keys for deterministic output
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      return Object.keys(val)
        .sort()
        .reduce((sorted, k) => {
          sorted[k] = val[k];
          return sorted;
        }, {} as any);
    }
    
    return val;
  });
}

/**
 * Canonically serialize and compute SHA-256 hash.
 * 
 * @param value - The value to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function hashCanonical(value: any): string {
  const { createHash } = require("crypto");
  const canonical = stableStringify(value);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
