/**
 * Chain-of-Custody Integration Tests
 * 
 * Tests complete workflow:
 * 1. Create case → upload source → create claim → finalize → verify
 * 2. Tamper detection: modify stored data → verify returns mismatch
 * 
 * Legal Hardening Sprint v1.0
 */

import { describe, it, expect } from "vitest";
import { 
  createManifest,
  verifyManifestIntegrity,
  computeFileHash,
  computeFragmentHash,
} from "../chainOfCustodyUtil";
import type { ChainOfCustodyManifestV1 } from "../schemas/chainOfCustody";

describe("Chain-of-Custody Integration Tests", () => {
  const testCaseId = "test-case-coc-" + Date.now();
  const testUserId = "test-user-investigator";
  const testSourceId = "test-source-" + Date.now();
  
  // Test file data
  const testFileContent = Buffer.from("This is a test document for chain of custody verification.", "utf-8");
  const testFilename = "test-evidence.txt";
  const testSha256 = computeFileHash(testFileContent);

  it("should create a valid manifest with sources and claims", () => {
    const sources = [
      {
        source_id: testSourceId,
        filename: testFilename,
        sha256: testSha256,
        byte_length: testFileContent.length,
        ingested_at: new Date().toISOString(),
      },
    ];
    
    const testFragment = "test document for chain of custody";
    const fragmentHash = computeFragmentHash(testFragment);
    
    const claims = [
      {
        claim_id: "claim-1",
        source_id: testSourceId,
        start_offset: 10,
        end_offset: 45,
        sha256_fragment: fragmentHash,
        assertion_type: "system-derived" as const,
      },
    ];
    
    const manifest = createManifest(
      testCaseId,
      testUserId,
      sources,
      claims,
      "report-hash-placeholder"
    );
    
    expect(manifest.manifest_version).toBe("1.0");
    expect(manifest.case_id).toBe(testCaseId);
    expect(manifest.created_by).toBe(testUserId);
    expect(manifest.sources).toHaveLength(1);
    expect(manifest.claims).toHaveLength(1);
    expect(manifest.evidence_pack_hash).toBeTruthy();
    expect(manifest.report_hash).toBe("report-hash-placeholder");
  });

  it("should verify a valid manifest successfully", () => {
    const sources = [
      {
        source_id: testSourceId,
        filename: testFilename,
        sha256: testSha256,
        byte_length: testFileContent.length,
        ingested_at: new Date().toISOString(),
      },
    ];
    
    const testFragment = "test document for chain of custody";
    const fragmentHash = computeFragmentHash(testFragment);
    
    const claims = [
      {
        claim_id: "claim-1",
        source_id: testSourceId,
        start_offset: 10,
        end_offset: 45,
        sha256_fragment: fragmentHash,
        assertion_type: "system-derived" as const,
      },
    ];
    
    const manifest = createManifest(
      testCaseId,
      testUserId,
      sources,
      claims,
      "report-hash-placeholder"
    );
    
    const verification = verifyManifestIntegrity(manifest);
    
    expect(verification.status).toBe("valid");
    expect(verification.computed_hash).toBe(manifest.evidence_pack_hash);
    expect(verification.error_details).toBeUndefined();
  });

  it("should detect tampering when source hash is modified", () => {
    const sources = [
      {
        source_id: testSourceId,
        filename: testFilename,
        sha256: testSha256,
        byte_length: testFileContent.length,
        ingested_at: new Date().toISOString(),
      },
    ];
    
    const testFragment = "test document for chain of custody";
    const fragmentHash = computeFragmentHash(testFragment);
    
    const claims = [
      {
        claim_id: "claim-1",
        source_id: testSourceId,
        start_offset: 10,
        end_offset: 45,
        sha256_fragment: fragmentHash,
        assertion_type: "system-derived" as const,
      },
    ];
    
    const manifest = createManifest(
      testCaseId,
      testUserId,
      sources,
      claims,
      "report-hash-placeholder"
    );
    
    // Simulate tampering: modify source hash in manifest
    const tamperedManifest: ChainOfCustodyManifestV1 = {
      ...manifest,
      sources: [
        {
          ...manifest.sources[0],
          sha256: "0000000000000000000000000000000000000000000000000000000000000000",
        },
      ],
    };
    
    const verification = verifyManifestIntegrity(tamperedManifest);
    
    expect(verification.status).toBe("mismatch");
    expect(verification.computed_hash).not.toBe(tamperedManifest.evidence_pack_hash);
    expect(verification.error_details).toContain("Expected");
  });

  it("should detect tampering when claim is modified", () => {
    const sources = [
      {
        source_id: testSourceId,
        filename: testFilename,
        sha256: testSha256,
        byte_length: testFileContent.length,
        ingested_at: new Date().toISOString(),
      },
    ];
    
    const testFragment = "test document for chain of custody";
    const fragmentHash = computeFragmentHash(testFragment);
    
    const claims = [
      {
        claim_id: "claim-1",
        source_id: testSourceId,
        start_offset: 10,
        end_offset: 45,
        sha256_fragment: fragmentHash,
        assertion_type: "system-derived" as const,
      },
    ];
    
    const manifest = createManifest(
      testCaseId,
      testUserId,
      sources,
      claims,
      "report-hash-placeholder"
    );
    
    // Simulate tampering: modify claim offset
    const tamperedManifest: ChainOfCustodyManifestV1 = {
      ...manifest,
      claims: [
        {
          ...manifest.claims[0],
          start_offset: 0, // Changed from 10
          end_offset: 35,  // Changed from 45
        },
      ],
    };
    
    const verification = verifyManifestIntegrity(tamperedManifest);
    
    expect(verification.status).toBe("mismatch");
    expect(verification.computed_hash).not.toBe(tamperedManifest.evidence_pack_hash);
    expect(verification.error_details).toContain("Expected");
  });

  it("should detect tampering when assertion type is changed", () => {
    const sources = [
      {
        source_id: testSourceId,
        filename: testFilename,
        sha256: testSha256,
        byte_length: testFileContent.length,
        ingested_at: new Date().toISOString(),
      },
    ];
    
    const testFragment = "test document for chain of custody";
    const fragmentHash = computeFragmentHash(testFragment);
    
    const claims = [
      {
        claim_id: "claim-1",
        source_id: testSourceId,
        start_offset: 10,
        end_offset: 45,
        sha256_fragment: fragmentHash,
        assertion_type: "user-asserted" as const,
        user_id: testUserId,
        user_override_at: new Date().toISOString(),
      },
    ];
    
    const manifest = createManifest(
      testCaseId,
      testUserId,
      sources,
      claims,
      "report-hash-placeholder"
    );
    
    // Simulate tampering: change user-asserted to system-derived
    const tamperedManifest: ChainOfCustodyManifestV1 = {
      ...manifest,
      claims: [
        {
          claim_id: manifest.claims[0].claim_id,
          source_id: manifest.claims[0].source_id,
          start_offset: manifest.claims[0].start_offset,
          end_offset: manifest.claims[0].end_offset,
          sha256_fragment: manifest.claims[0].sha256_fragment,
          assertion_type: "system-derived", // Changed from user-asserted
        },
      ],
    };
    
    const verification = verifyManifestIntegrity(tamperedManifest);
    
    expect(verification.status).toBe("mismatch");
    expect(verification.computed_hash).not.toBe(tamperedManifest.evidence_pack_hash);
  });

  it("should maintain chain integrity across multiple manifests", () => {
    const sources = [
      {
        source_id: testSourceId,
        filename: testFilename,
        sha256: testSha256,
        byte_length: testFileContent.length,
        ingested_at: new Date().toISOString(),
      },
    ];
    
    const testFragment = "test document";
    const fragmentHash = computeFragmentHash(testFragment);
    
    const claims = [
      {
        claim_id: "claim-1",
        source_id: testSourceId,
        start_offset: 10,
        end_offset: 23,
        sha256_fragment: fragmentHash,
        assertion_type: "system-derived" as const,
      },
    ];
    
    // Create first manifest
    const manifest1 = createManifest(
      testCaseId,
      testUserId,
      sources,
      claims,
      "report-hash-1"
    );
    
    // Create second manifest with previous hash
    const manifest2 = createManifest(
      testCaseId,
      testUserId,
      sources,
      claims,
      "report-hash-2",
      manifest1.evidence_pack_hash
    );
    
    expect(manifest2.previous_manifest_hash).toBe(manifest1.evidence_pack_hash);
    
    // Both manifests should verify independently
    expect(verifyManifestIntegrity(manifest1).status).toBe("valid");
    expect(verifyManifestIntegrity(manifest2).status).toBe("valid");
  });
});
