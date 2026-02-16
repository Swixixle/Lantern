/**
 * Chain-of-Custody API Routes
 * 
 * Endpoints for:
 * - Manifest creation and retrieval
 * - Integrity verification
 * - Evidence pack export
 * - Claim tracking with assertion types
 */

import type { Express, Request, Response } from "express";
import archiver from "archiver";
import { storage } from "./storage";
import {
  createManifest,
  createSourceEntry,
  createClaimEntry,
  verifyManifestIntegrity,
  computeEvidencePackHash,
  finalizeManifestWithReport,
} from "./chainOfCustodyUtil";
import type {
  ChainOfCustodyManifestV1,
  ChainOfCustodySource,
  ChainOfCustodyClaim,
} from "./schemas/chainOfCustody";
import { requirePermission, requireRole, UserRole, Permission } from "./rbac";
import { z } from "zod";
import { decryptFile } from "./lib/encryption";

/**
 * Register chain-of-custody routes.
 */
export function registerChainOfCustodyRoutes(app: Express) {
  /**
   * GET /api/case/:caseId/manifest
   * 
   * Retrieve current chain-of-custody manifest for a case.
   * Requires READ permission.
   */
  app.get("/api/case/:caseId/manifest", requirePermission(Permission.READ), async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      
      // Fetch latest manifest from database
      const manifests = await storage.db
        .select()
        .from(storage.schema.chainOfCustodyManifests)
        .where(storage.eq(storage.schema.chainOfCustodyManifests.caseId, caseId))
        .orderBy(storage.desc(storage.schema.chainOfCustodyManifests.createdAt))
        .limit(1);
      
      if (manifests.length === 0) {
        return res.status(404).json({
          error: "No manifest found for this case",
        });
      }
      
      const manifestRecord = manifests[0];
      const manifest: ChainOfCustodyManifestV1 = JSON.parse(manifestRecord.manifestJson);
      
      return res.json({
        manifest,
        manifest_id: manifestRecord.id,
        created_at: manifestRecord.createdAt,
      });
    } catch (error) {
      console.error("Error fetching manifest:", error);
      return res.status(500).json({
        error: "Failed to fetch manifest",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/case/:caseId/verify
   * 
   * Verify integrity of case evidence pack by recomputing hashes.
   * Requires VERIFY permission (Auditor or Lead Investigator).
   */
  app.get("/api/case/:caseId/verify", requirePermission(Permission.VERIFY), async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      
      // Fetch latest manifest
      const manifests = await storage.db
        .select()
        .from(storage.schema.chainOfCustodyManifests)
        .where(storage.eq(storage.schema.chainOfCustodyManifests.caseId, caseId))
        .orderBy(storage.desc(storage.schema.chainOfCustodyManifests.createdAt))
        .limit(1);
      
      if (manifests.length === 0) {
        return res.status(404).json({
          error: "No manifest found for this case",
        });
      }
      
      const manifestRecord = manifests[0];
      const manifest: ChainOfCustodyManifestV1 = JSON.parse(manifestRecord.manifestJson);
      
      // Verify integrity
      const result = verifyManifestIntegrity(manifest);
      
      return res.json(result);
    } catch (error) {
      console.error("Error verifying manifest:", error);
      return res.status(500).json({
        error: "Failed to verify manifest",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/case/:caseId/finalize
   * 
   * Finalize evidence pack and create immutable manifest.
   * Requires WRITE permission (Lead Investigator only).
   */
  app.post("/api/case/:caseId/finalize", requireRole(UserRole.LEAD_INVESTIGATOR), async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const { report_hash } = req.body;
      
      // @ts-ignore - req.user exists when authenticated
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Fetch all enhanced sources for this case
      const sources = await storage.db
        .select()
        .from(storage.schema.enhancedSources)
        .where(storage.eq(storage.schema.enhancedSources.caseId, caseId));
      
      // Fetch all tracked claims for this case
      const claims = await storage.db
        .select()
        .from(storage.schema.trackedClaims)
        .where(storage.eq(storage.schema.trackedClaims.caseId, caseId));
      
      // Convert to manifest format
      const manifestSources: ChainOfCustodySource[] = sources.map(s => ({
        source_id: s.id,
        filename: s.filename,
        sha256: s.sha256,
        byte_length: s.byteLength,
        ingested_at: s.ingestedAt.toISOString(),
      }));
      
      const manifestClaims: ChainOfCustodyClaim[] = claims.map(c => ({
        claim_id: c.id,
        source_id: c.sourceId,
        start_offset: c.startOffset,
        end_offset: c.endOffset,
        sha256_fragment: c.sha256Fragment,
        assertion_type: c.assertionType as "system-derived" | "user-asserted",
        user_override_at: c.userOverrideAt?.toISOString(),
        user_id: c.userId || undefined,
      }));
      
      // Check for previous manifest to enable chaining
      const previousManifests = await storage.db
        .select()
        .from(storage.schema.chainOfCustodyManifests)
        .where(storage.eq(storage.schema.chainOfCustodyManifests.caseId, caseId))
        .orderBy(storage.desc(storage.schema.chainOfCustodyManifests.createdAt))
        .limit(1);
      
      const previousManifestHash = previousManifests.length > 0
        ? previousManifests[0].evidencePackHash
        : undefined;
      
      // Create manifest
      const manifest = createManifest(
        caseId,
        userId,
        manifestSources,
        manifestClaims,
        report_hash,
        previousManifestHash
      );
      
      // Store manifest in database
      const [manifestRecord] = await storage.db
        .insert(storage.schema.chainOfCustodyManifests)
        .values({
          caseId,
          manifestVersion: manifest.manifest_version,
          manifestJson: JSON.stringify(manifest),
          evidencePackHash: manifest.evidence_pack_hash,
          reportHash: manifest.report_hash,
          previousManifestHash: manifest.previous_manifest_hash,
          createdBy: userId,
        })
        .returning();
      
      return res.json({
        success: true,
        manifest_id: manifestRecord.id,
        manifest,
      });
    } catch (error) {
      console.error("Error finalizing manifest:", error);
      return res.status(500).json({
        error: "Failed to finalize manifest",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/case/:caseId/claim
   * 
   * Create a new claim with assertion type tracking.
   * Requires WRITE permission (Lead Investigator only).
   */
  app.post("/api/case/:caseId/claim", requireRole(UserRole.LEAD_INVESTIGATOR), async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const claimSchema = z.object({
        source_id: z.string(),
        start_offset: z.number(),
        end_offset: z.number(),
        fragment_text: z.string(),
        assertion_type: z.enum(["system-derived", "user-asserted"]),
        confidence: z.number().optional(),
        claim_text: z.string().optional(),
        justification: z.string().optional(),
      });
      
      const claimData = claimSchema.parse(req.body);
      
      // @ts-ignore - req.user exists when authenticated
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Create claim entry
      const claimEntry = createClaimEntry(
        "", // ID will be generated by database
        claimData.source_id,
        claimData.fragment_text,
        claimData.start_offset,
        claimData.end_offset,
        claimData.assertion_type,
        claimData.assertion_type === "user-asserted" ? userId : undefined
      );
      
      // Store claim in database
      const [claim] = await storage.db
        .insert(storage.schema.trackedClaims)
        .values({
          caseId,
          sourceId: claimData.source_id,
          startOffset: claimData.start_offset,
          endOffset: claimData.end_offset,
          sha256Fragment: claimEntry.sha256_fragment,
          assertionType: claimData.assertion_type,
          userOverrideAt: claimData.assertion_type === "user-asserted" ? new Date() : null,
          userId: claimData.assertion_type === "user-asserted" ? userId : null,
          claimText: claimData.claim_text,
          confidence: claimData.confidence,
        })
        .returning();
      
      return res.json({
        success: true,
        claim,
      });
    } catch (error) {
      console.error("Error creating claim:", error);
      return res.status(500).json({
        error: "Failed to create claim",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/case/:caseId/export
   * 
   * Export complete evidence package as ZIP bundle with:
   * - manifest.json (chain-of-custody manifest)
   * - sources/ directory (encrypted or plaintext files)
   * - claims.json (all extracted claims)
   * - events.jsonl (ledger events in JSON Lines format)
   * - report.md (optional case report)
   * - hashes.json (quick integrity reference)
   * 
   * Requires READ permission.
   * 
   * Query parameters:
   * - include_plaintext=true: Include decrypted sources (requires authorization)
   * - include_report=true: Include generated markdown report
   * - verify_before_export=true: Run integrity check before export
   */
  app.get("/api/case/:caseId/export", requirePermission(Permission.READ), async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const includePlaintext = req.query.include_plaintext === "true";
      const includeReport = req.query.include_report === "true";
      const verifyBeforeExport = req.query.verify_before_export === "true";
      
      // Fetch latest manifest
      const manifests = await storage.db
        .select()
        .from(storage.schema.chainOfCustodyManifests)
        .where(storage.eq(storage.schema.chainOfCustodyManifests.caseId, caseId))
        .orderBy(storage.desc(storage.schema.chainOfCustodyManifests.createdAt))
        .limit(1);
      
      if (manifests.length === 0) {
        return res.status(404).json({
          error: "No manifest found for this case. Finalize the case first.",
        });
      }
      
      const manifestRecord = manifests[0];
      const manifest: ChainOfCustodyManifestV1 = JSON.parse(manifestRecord.manifestJson);
      
      // Optional: Verify integrity before export
      if (verifyBeforeExport) {
        const verification = verifyManifestIntegrity(manifest);
        if (verification.status !== "valid") {
          return res.status(409).json({
            error: "Case integrity check failed. Export aborted.",
            verification,
          });
        }
      }
      
      // Create ZIP archive
      const archive = archiver("zip", { zlib: { level: 9 } });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `evidence-package-${caseId}-${timestamp}.zip`;
      
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      
      // Pipe archive to response
      archive.pipe(res);
      
      // Add manifest.json
      archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });
      
      // Fetch and add sources
      const sources = await storage.db
        .select()
        .from(storage.schema.enhancedSources)
        .where(storage.eq(storage.schema.enhancedSources.caseId, caseId));
      
      for (const source of sources) {
        if (source.encryptedBlob) {
          const encrypted = JSON.parse(source.encryptedBlob);
          
          if (includePlaintext) {
            // Decrypt and include plaintext
            try {
              const decrypted = decryptFile(encrypted);
              archive.append(decrypted, { 
                name: `sources/${source.id}/${source.filename}` 
              });
            } catch (error) {
              console.error(`Failed to decrypt source ${source.id}:`, error);
              // Add metadata only if decryption fails
              archive.append(JSON.stringify({
                source_id: source.id,
                filename: source.filename,
                error: "Decryption failed",
              }, null, 2), { 
                name: `sources/${source.id}/ERROR.json` 
              });
            }
          } else {
            // Include encrypted blob
            archive.append(JSON.stringify(encrypted, null, 2), { 
              name: `sources/${source.id}/${source.filename}.enc` 
            });
          }
          
          // Add source metadata
          archive.append(JSON.stringify({
            source_id: source.id,
            filename: source.filename,
            sha256_raw: source.sha256Raw,
            byte_length: source.byteLength,
            uploaded_at: source.uploadedAt,
          }, null, 2), { 
            name: `sources/${source.id}/metadata.json` 
          });
        }
      }
      
      // Fetch and add claims
      const claims = await storage.db
        .select()
        .from(storage.schema.trackedClaims)
        .where(storage.eq(storage.schema.trackedClaims.caseId, caseId));
      
      archive.append(JSON.stringify(claims, null, 2), { name: "claims.json" });
      
      // Fetch and add ledger events (JSON Lines format)
      const events = await storage.db
        .select()
        .from(storage.schema.ledgerEvents)
        .where(storage.eq(storage.schema.ledgerEvents.caseId, caseId))
        .orderBy(storage.asc(storage.schema.ledgerEvents.seq));
      
      const eventsJsonl = events.map(e => JSON.stringify(e)).join("\n");
      archive.append(eventsJsonl, { name: "events.jsonl" });
      
      // Create hashes.json for quick integrity reference
      const hashes = {
        manifest_hash: manifestRecord.evidencePackHash,
        source_hashes: manifest.sources.map(s => ({
          source_id: s.source_id,
          filename: s.filename,
          sha256: s.sha256,
        })),
        claim_hashes: manifest.claims.map(c => ({
          claim_id: c.claim_id,
          sha256_fragment: c.sha256_fragment,
        })),
        export_timestamp: new Date().toISOString(),
      };
      archive.append(JSON.stringify(hashes, null, 2), { name: "hashes.json" });
      
      // Optional: Add report.md
      if (includeReport && manifest.report_hash) {
        // Fetch report from database if available
        const reports = await storage.db
          .select()
          .from(storage.schema.incidentReports)
          .where(storage.eq(storage.schema.incidentReports.caseId, caseId))
          .orderBy(storage.desc(storage.schema.incidentReports.createdAt))
          .limit(1);
        
        if (reports.length > 0 && reports[0].markdownContent) {
          archive.append(reports[0].markdownContent, { name: "report.md" });
        }
      }
      
      // Add README explaining the bundle structure
      const readme = `# Lantern Evidence Package

**Case ID:** ${caseId}
**Export Date:** ${new Date().toISOString()}
**Manifest Version:** ${manifest.manifest_version}

## Bundle Contents

- **manifest.json**: Chain-of-custody manifest with all sources and claims
- **sources/**: Evidence files (${includePlaintext ? "plaintext" : "encrypted"})
  - Each source has its own directory with:
    - File content (.enc for encrypted, original name for plaintext)
    - metadata.json with hash and upload info
- **claims.json**: All extracted claims with provenance
- **events.jsonl**: Complete ledger history (JSON Lines format)
- **hashes.json**: Quick integrity reference
${includeReport ? "- **report.md**: Generated case report\n" : ""}

## Verification

To verify integrity:

\`\`\`bash
# Using Lantern API
curl -X GET "http://localhost:5000/api/case/${caseId}/verify"

# Or manually
sha256sum sources/*/metadata.json
\`\`\`

## Import

To import this package into another Lantern instance:

\`\`\`bash
curl -X POST "http://localhost:5000/api/case/import" \\
  -F "bundle=@${filename}"
\`\`\`

## Legal Notice

This evidence package was exported from Lantern.
Chain-of-custody is maintained through cryptographic hashing.
Verify integrity before use in legal proceedings.

For verification procedures, see:
https://github.com/Swixixle/Lantern/blob/main/docs/CHAIN_OF_CUSTODY_VERIFICATION.md
`;
      
      archive.append(readme, { name: "README.md" });
      
      // Finalize archive
      await archive.finalize();
      
    } catch (error) {
      console.error("Error exporting evidence package:", error);
      if (!res.headersSent) {
        return res.status(500).json({
          error: "Failed to export evidence package",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  });

  /**
   * POST /api/case/import
   * 
   * Import an evidence package from exported ZIP bundle.
   * Creates a new case and validates integrity.
   * 
   * Requires WRITE permission.
   * 
   * Expected bundle structure:
   * - manifest.json
   * - sources/ directory
   * - claims.json
   * - events.jsonl
   * - hashes.json
   * 
   * Returns import status with integrity check results.
   */
  app.post("/api/case/import", requireRole(UserRole.LEAD_INVESTIGATOR), async (req: Request, res: Response) => {
    try {
      // This is a placeholder for the import functionality
      // Full implementation requires:
      // 1. Multipart file upload handling (multer middleware)
      // 2. ZIP extraction (adm-zip or archiver)
      // 3. Manifest parsing and validation
      // 4. Source hash recomputation
      // 5. Database insertion with new case ID
      // 6. Integrity verification
      // 7. Status reporting
      
      return res.status(501).json({
        error: "Import functionality not yet implemented",
        message: "This endpoint will be implemented in the next phase. " +
                 "For now, use manual database restoration from backups.",
        required_steps: [
          "1. Add multer middleware for file upload",
          "2. Extract ZIP bundle",
          "3. Parse and validate manifest.json",
          "4. Recompute all source hashes",
          "5. Create new case in database",
          "6. Import sources, claims, and events",
          "7. Run full integrity verification",
          "8. Return status with any warnings"
        ]
      });
      
    } catch (error) {
      console.error("Error importing evidence package:", error);
      return res.status(500).json({
        error: "Failed to import evidence package",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
