import type { Pack } from "@/lib/schema/pack_v1";
import type { Lens } from "@/context/LensContext";
import type {
  InfluenceHubsFinding,
  FundingGravityFinding,
  EnforcementMapFinding,
} from "@/lib/heuristics/types";
import { renderNewsroomMarkdown } from "@/export/templates/newsroom";
import { renderLegalMarkdown } from "@/export/templates/legal";
import { renderNewsroomOnePager } from "@/export/templates/newsroomOnePager";
import { renderLegalOnePager } from "@/export/templates/legalOnePager";

const TOOL_VERSION = "0.1.8";
const SCHEMA_VERSION = "lantern.evidence_pack.v0";

async function sha256Bytes(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function toBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

interface Findings {
  influence: InfluenceHubsFinding | null;
  funding: FundingGravityFinding | null;
  enforcement: EnforcementMapFinding | null;
}

export async function exportEvidencePack(
  pack: Pack,
  lens: Lens,
  findings: Findings,
  reportHash: string
): Promise<Blob> {
  const createdAt = new Date().toISOString();

  const dossierMd =
    lens === "legal"
      ? renderLegalMarkdown(pack, findings, reportHash, createdAt)
      : renderNewsroomMarkdown(pack, findings, reportHash, createdAt);

  const claimsJson = JSON.stringify(
    {
      pack_id: pack.packId,
      export_lens: lens,
      claims: [...pack.claims]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((c) => ({
          id: c.id,
          type: c.claimType,
          text: c.text,
          confidence: c.confidence,
          evidence_ids: c.evidenceIds,
          created_at: c.createdAt,
        })),
    },
    null,
    2
  );

  const sourcesJson = JSON.stringify(
    {
      pack_id: pack.packId,
      sources: [...pack.evidence]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((ev) => ({
          id: ev.id,
          title: ev.title,
          source_type: ev.sourceType,
          date: ev.date,
          url: ev.url || null,
        })),
      raw_sources_included: false,
      raw_sources_reason: "Raw source embedding not implemented in v0",
    },
    null,
    2
  );

  const appJson = JSON.stringify(
    {
      tool: "Lantern",
      tool_version: TOOL_VERSION,
      schema_version: SCHEMA_VERSION,
      generated_at: createdAt,
      identity: "Evidence-first investigative workbench",
      constraints: [
        "No inference",
        "No synthesis",
        "No conclusions beyond evidence",
        "Source-bound claims only",
      ],
    },
    null,
    2
  );

  const onePagerMd =
    lens === "legal"
      ? renderLegalOnePager(pack, reportHash, createdAt)
      : renderNewsroomOnePager(pack, reportHash, createdAt);

  const dossierBytes = toBytes(dossierMd);
  const claimsBytes = toBytes(claimsJson);
  const sourcesBytes = toBytes(sourcesJson);
  const appBytes = toBytes(appJson);
  const onePagerBytes = toBytes(onePagerMd);

  const dossierHash = await sha256Bytes(dossierBytes);
  const claimsHash = await sha256Bytes(claimsBytes);
  const sourcesHash = await sha256Bytes(sourcesBytes);
  const appHash = await sha256Bytes(appBytes);
  const onePagerHash = await sha256Bytes(onePagerBytes);

  const manifestJson = JSON.stringify(
    {
      schema: SCHEMA_VERSION,
      pack_id: pack.packId,
      case_id: pack.packId,
      export_lens: lens,
      created_at: createdAt,
      tool_version: TOOL_VERSION,
      schema_version: pack.schemaVersion,
      report_hash: reportHash,
      files: {
        "DOSSIER.md": { sha256: dossierHash, size: dossierBytes.byteLength },
        "ONE_PAGER.md": { sha256: onePagerHash, size: onePagerBytes.byteLength },
        "CLAIMS.json": { sha256: claimsHash, size: claimsBytes.byteLength },
        "SOURCES.json": { sha256: sourcesHash, size: sourcesBytes.byteLength },
        "APP.json": { sha256: appHash, size: appBytes.byteLength },
      },
      raw_sources_included: false,
      raw_sources_reason: "Raw source embedding not implemented in v0",
    },
    null,
    2
  );

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file("MANIFEST.json", manifestJson);
  zip.file("DOSSIER.md", dossierBytes);
  zip.file("ONE_PAGER.md", onePagerBytes);
  zip.file("CLAIMS.json", claimsBytes);
  zip.file("SOURCES.json", sourcesBytes);
  zip.file("APP.json", appBytes);

  return zip.generateAsync({ type: "blob" });
}
