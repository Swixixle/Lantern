/**
 * Chain-of-Custody Manifest Schema (HALO-compatible)
 * 
 * Provides deterministic, immutable evidence tracking with:
 * - Source-level SHA-256 hashing at ingestion
 * - Evidence pack integrity fingerprints
 * - Report hash verification
 * - User assertion vs system-derived claim tracking
 * 
 * This schema enables forensic-grade evidence handling suitable
 * for legal proceedings and investigative infrastructure.
 */

/**
 * Source file entry in chain-of-custody manifest.
 * Captures immutable properties at ingestion time.
 */
export interface ChainOfCustodySource {
  /** Unique identifier for this source */
  source_id: string;
  
  /** Original filename */
  filename: string;
  
  /** SHA-256 hash of raw file bytes (NOT string, NOT normalized) */
  sha256: string;
  
  /** Byte length of original file */
  byte_length: number;
  
  /** ISO8601 timestamp of ingestion */
  ingested_at: string;
}

/**
 * Claim entry with provenance tracking.
 * Distinguishes between system-derived and user-asserted claims.
 */
export interface ChainOfCustodyClaim {
  /** Unique identifier for this claim */
  claim_id: string;
  
  /** Source document this claim references */
  source_id: string;
  
  /** Character offset where claim evidence begins */
  start_offset: number;
  
  /** Character offset where claim evidence ends */
  end_offset: number;
  
  /** SHA-256 hash of the extracted fragment */
  sha256_fragment: string;
  
  /** Origin of this claim */
  assertion_type: "system-derived" | "user-asserted";
  
  /** Optional: ISO8601 timestamp when user overrode system */
  user_override_at?: string;
  
  /** Optional: User ID who asserted this claim */
  user_id?: string;
}

/**
 * Complete Chain-of-Custody Manifest V1.
 * 
 * This structure is cryptographically signed and can be
 * independently verified by third parties.
 */
export interface ChainOfCustodyManifestV1 {
  /** Schema version for forward compatibility */
  manifest_version: "1.0";
  
  /** Case identifier this manifest belongs to */
  case_id: string;
  
  /** ISO8601 timestamp when manifest was created */
  created_at: string;
  
  /** User ID who created this manifest */
  created_by: string;
  
  /** All source files tracked in this case */
  sources: ChainOfCustodySource[];
  
  /** All claims with evidence fragments */
  claims: ChainOfCustodyClaim[];
  
  /** SHA-256 hash of entire evidence pack (canonical JSON) */
  evidence_pack_hash: string;
  
  /** SHA-256 hash of final report output (PDF/markdown bytes) */
  report_hash: string;
  
  /** Optional: Previous manifest hash for chain linking */
  previous_manifest_hash?: string;
}

/**
 * Integrity verification result.
 */
export interface IntegrityCheckResult {
  /** Verification status */
  status: "valid" | "mismatch" | "missing";
  
  /** Stored evidence pack hash */
  evidence_pack_hash: string;
  
  /** Stored report hash */
  report_hash: string;
  
  /** Recomputed hash from current data */
  computed_hash: string;
  
  /** ISO8601 timestamp of verification */
  timestamp: string;
  
  /** Optional: Details about mismatch */
  error_details?: string;
}

/**
 * Type guard to validate manifest structure.
 */
export function isChainOfCustodyManifestV1(obj: any): obj is ChainOfCustodyManifestV1 {
  return (
    obj &&
    obj.manifest_version === "1.0" &&
    typeof obj.case_id === "string" &&
    typeof obj.created_at === "string" &&
    typeof obj.created_by === "string" &&
    Array.isArray(obj.sources) &&
    Array.isArray(obj.claims) &&
    typeof obj.evidence_pack_hash === "string" &&
    typeof obj.report_hash === "string"
  );
}
