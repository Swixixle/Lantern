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
import { z } from "zod";

/**
 * Register chain-of-custody routes.
 */
export function registerChainOfCustodyRoutes(app: Express) {
  /**
   * GET /api/case/:caseId/manifest
   * 
   * Retrieve current chain-of-custody manifest for a case.
   */
  app.get("/api/case/:caseId/manifest", async (req: Request, res: Response) => {
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
   */
  app.get("/api/case/:caseId/verify", async (req: Request, res: Response) => {
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
   */
  app.post("/api/case/:caseId/finalize", async (req: Request, res: Response) => {
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
   */
  app.post("/api/case/:caseId/claim", async (req: Request, res: Response) => {
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
   * Export complete evidence package with manifest.
   */
  app.get("/api/case/:caseId/export", async (req: Request, res: Response) => {
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
          error: "No manifest found for this case. Finalize the case first.",
        });
      }
      
      const manifestRecord = manifests[0];
      const manifest: ChainOfCustodyManifestV1 = JSON.parse(manifestRecord.manifestJson);
      
      // Verify integrity before export
      const verification = verifyManifestIntegrity(manifest);
      
      return res.json({
        manifest,
        verification,
        export_timestamp: new Date().toISOString(),
        case_id: caseId,
      });
    } catch (error) {
      console.error("Error exporting evidence package:", error);
      return res.status(500).json({
        error: "Failed to export evidence package",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
