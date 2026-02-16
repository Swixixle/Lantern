/**
 * Chain-of-Custody Manifest Utilities
 * 
 * Functions for creating, verifying, and managing chain-of-custody manifests.
 */

import { createHash } from "crypto";
import { stableStringify, hashCanonical } from "../lib/stableStringify";
import type {
  ChainOfCustodyManifestV1,
  ChainOfCustodySource,
  ChainOfCustodyClaim,
  IntegrityCheckResult,
} from "../schemas/chainOfCustody";

/**
 * Compute SHA-256 hash of raw bytes.
 * 
 * @param buffer - Raw file bytes
 * @returns Hex-encoded SHA-256 hash
 */
export function computeFileHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Compute SHA-256 hash of a text fragment.
 * 
 * @param text - Text fragment
 * @returns Hex-encoded SHA-256 hash
 */
export function computeFragmentHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Create a source entry for chain-of-custody manifest.
 * 
 * @param sourceId - Unique source identifier
 * @param filename - Original filename
 * @param fileBuffer - Raw file bytes
 * @returns Source entry with hash
 */
export function createSourceEntry(
  sourceId: string,
  filename: string,
  fileBuffer: Buffer
): ChainOfCustodySource {
  return {
    source_id: sourceId,
    filename,
    sha256: computeFileHash(fileBuffer),
    byte_length: fileBuffer.length,
    ingested_at: new Date().toISOString(),
  };
}

/**
 * Create a claim entry for chain-of-custody manifest.
 * 
 * @param claimId - Unique claim identifier
 * @param sourceId - Source document identifier
 * @param fragment - Extracted text fragment
 * @param startOffset - Character offset where fragment begins
 * @param endOffset - Character offset where fragment ends
 * @param assertionType - Whether system-derived or user-asserted
 * @param userId - Optional user ID if user-asserted
 * @returns Claim entry with fragment hash
 */
export function createClaimEntry(
  claimId: string,
  sourceId: string,
  fragment: string,
  startOffset: number,
  endOffset: number,
  assertionType: "system-derived" | "user-asserted",
  userId?: string
): ChainOfCustodyClaim {
  const entry: ChainOfCustodyClaim = {
    claim_id: claimId,
    source_id: sourceId,
    start_offset: startOffset,
    end_offset: endOffset,
    sha256_fragment: computeFragmentHash(fragment),
    assertion_type: assertionType,
  };
  
  if (assertionType === "user-asserted" && userId) {
    entry.user_override_at = new Date().toISOString();
    entry.user_id = userId;
  }
  
  return entry;
}

/**
 * Compute evidence pack hash from sources and claims.
 * 
 * Uses canonical JSON serialization to ensure deterministic hashing.
 * 
 * @param caseId - Case identifier
 * @param sources - Array of source entries
 * @param claims - Array of claim entries
 * @returns Hex-encoded SHA-256 hash
 */
export function computeEvidencePackHash(
  caseId: string,
  sources: ChainOfCustodySource[],
  claims: ChainOfCustodyClaim[]
): string {
  const pack = {
    case_id: caseId,
    sources: sources.map(s => ({
      source_id: s.source_id,
      filename: s.filename,
      sha256: s.sha256,
      byte_length: s.byte_length,
      ingested_at: s.ingested_at,
    })),
    claims: claims.map(c => ({
      claim_id: c.claim_id,
      source_id: c.source_id,
      start_offset: c.start_offset,
      end_offset: c.end_offset,
      sha256_fragment: c.sha256_fragment,
      assertion_type: c.assertion_type,
    })),
  };
  
  return hashCanonical(pack);
}

/**
 * Compute report hash from final output bytes.
 * 
 * @param reportBytes - Final report bytes (PDF, markdown, etc.)
 * @returns Hex-encoded SHA-256 hash
 */
export function computeReportHash(reportBytes: Buffer): string {
  return createHash("sha256").update(reportBytes).digest("hex");
}

/**
 * Create a complete chain-of-custody manifest.
 * 
 * @param caseId - Case identifier
 * @param createdBy - User ID of creator
 * @param sources - Array of source entries
 * @param claims - Array of claim entries
 * @param reportHash - Optional report hash (if report generated)
 * @param previousManifestHash - Optional previous manifest hash for chaining
 * @returns Complete manifest
 */
export function createManifest(
  caseId: string,
  createdBy: string,
  sources: ChainOfCustodySource[],
  claims: ChainOfCustodyClaim[],
  reportHash?: string,
  previousManifestHash?: string
): ChainOfCustodyManifestV1 {
  const evidencePackHash = computeEvidencePackHash(caseId, sources, claims);
  
  return {
    manifest_version: "1.0",
    case_id: caseId,
    created_at: new Date().toISOString(),
    created_by: createdBy,
    sources,
    claims,
    evidence_pack_hash: evidencePackHash,
    report_hash: reportHash || "",
    previous_manifest_hash: previousManifestHash,
  };
}

/**
 * Verify integrity of a manifest by recomputing hashes.
 * 
 * @param manifest - Manifest to verify
 * @returns Integrity check result
 */
export function verifyManifestIntegrity(
  manifest: ChainOfCustodyManifestV1
): IntegrityCheckResult {
  try {
    // Recompute evidence pack hash
    const computedHash = computeEvidencePackHash(
      manifest.case_id,
      manifest.sources,
      manifest.claims
    );
    
    const isValid = computedHash === manifest.evidence_pack_hash;
    
    return {
      status: isValid ? "valid" : "mismatch",
      evidence_pack_hash: manifest.evidence_pack_hash,
      report_hash: manifest.report_hash,
      computed_hash: computedHash,
      timestamp: new Date().toISOString(),
      error_details: isValid
        ? undefined
        : `Expected ${manifest.evidence_pack_hash}, computed ${computedHash}`,
    };
  } catch (error) {
    return {
      status: "missing",
      evidence_pack_hash: manifest.evidence_pack_hash,
      report_hash: manifest.report_hash,
      computed_hash: "",
      timestamp: new Date().toISOString(),
      error_details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Add report hash to existing manifest (for finalization).
 * 
 * @param manifest - Existing manifest
 * @param reportBytes - Final report bytes
 * @returns Updated manifest with report hash
 */
export function finalizeManifestWithReport(
  manifest: ChainOfCustodyManifestV1,
  reportBytes: Buffer
): ChainOfCustodyManifestV1 {
  return {
    ...manifest,
    report_hash: computeReportHash(reportBytes),
  };
}

/**
 * Chain manifests by adding previous hash.
 * 
 * @param currentManifest - Current manifest to chain
 * @param previousManifest - Previous manifest in chain
 * @returns Updated manifest with previous hash
 */
export function chainManifests(
  currentManifest: ChainOfCustodyManifestV1,
  previousManifest: ChainOfCustodyManifestV1
): ChainOfCustodyManifestV1 {
  const previousHash = hashCanonical(previousManifest);
  
  return {
    ...currentManifest,
    previous_manifest_hash: previousHash,
  };
}
