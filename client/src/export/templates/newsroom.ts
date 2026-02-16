import type { Pack, Entity } from "@/lib/schema/pack_v1";
import type {
  InfluenceHubsFinding,
  FundingGravityFinding,
  EnforcementMapFinding,
  InfluenceHubResult,
  FunderStat,
  RecipientStat,
  EnforcerStat,
  TargetStat,
} from "@/lib/heuristics/types";
import { postureLineForExport } from "@/lib/posture";

const safeStr = (str: string): string =>
  str.replace(/\|/g, "\\|").replace(/`/g, "\\`");

export function renderNewsroomMarkdown(
  pack: Pack,
  findings: {
    influence: InfluenceHubsFinding | null;
    funding: FundingGravityFinding | null;
    enforcement: EnforcementMapFinding | null;
  },
  reportHash: string,
  createdAt?: string
): string {
  const date = (createdAt || new Date().toISOString()).split("T")[0];

  let md = `---
title: "${safeStr(pack.subjectName)} - Editor Review Packet"
date: ${date}
packId: ${pack.packId}
schemaVersion: ${pack.schemaVersion}
fingerprint: ${reportHash}
lens: newsroom
generatedBy: Lantern (Evidence-First Workbench)
---

# ${safeStr(pack.subjectName)} — Editor Review Packet
**Dossier ID:** \`${pack.packId}\`
**Date:** ${date}
**Fingerprint (SHA-256):** \`${reportHash}\`
**Lens:** Newsroom

> **Interpretation Limits**
> * Heuristics are indicators, not verdicts. Structural centrality or funding flows suggest influence pathways but do not prove wrongdoing or intent.
> * Evidence is point-in-time. Claims are based on available records as of the extraction date.
> * Source-bound analysis only. No inference, no synthesis, no conclusions.
> **Refusal Rule:** Claims without a bound source excerpt are refused and isolated in Unknown Inventory.

`;

  md += `## 01. Executive Summary\n\n`;
  const verified = pack.claims.filter((c) => c.claimType === "fact").length;
  const allegations = pack.claims.filter(
    (c) => c.claimType === "allegation"
  ).length;
  const unsourcedCount = pack.claims.filter((c) => c.evidenceIds.length === 0).length;
  const sourcedCount = pack.claims.length - unsourcedCount;
  md += `* **Verified Claims:** ${verified}\n`;
  md += `* **Allegations:** ${allegations}\n`;
  md += `* **Evidence Items:** ${pack.evidence.length}\n`;
  md += `* **Relationships:** ${pack.edges.length}\n`;
  md += `* **Curated Entities:** ${pack.entities.length}\n`;
  md += `* ${postureLineForExport({ defensible: sourcedCount, restricted: unsourcedCount, ambiguous: allegations }, "newsroom")}\n\n`;

  md += `## 02. Unknown Inventory\n\n`;
  const unsourced = pack.claims.filter((c) => c.evidenceIds.length === 0);
  if (unsourced.length === 0) {
    md += `*All claims have at least one evidence source.*\n\n`;
  } else {
    unsourced.forEach((c, i) => {
      const reason = c.evidenceIds.length === 0 ? "no bound excerpt" : 
                     c.counterEvidenceIds.length > 0 ? "conflicting sources" : "ambiguous support";
      md += `${i + 1}. ${safeStr(c.text)} — *Reason: ${reason}*\n`;
    });
    md += `\n`;
  }

  md += `## 03. Claims Ledger\n\n`;
  md += `| # | Type | Claim | Confidence | Evidence |\n`;
  md += `|---|------|-------|------------|----------|\n`;
  const sorted = [...pack.claims].sort(
    (a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id)
  );
  sorted.forEach((claim, i) => {
    md += `| ${i + 1} | ${claim.claimType.toUpperCase()} | ${safeStr(claim.text.slice(0, 80))} | ${(claim.confidence * 100).toFixed(0)}% | ${claim.evidenceIds.length} |\n`;
  });
  md += `\n`;

  md += `## 04. Timeline\n\n`;
  const datedClaims = pack.claims
    .filter((c) => c.createdAt)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  if (datedClaims.length === 0) {
    md += `*No timeline data available.*\n\n`;
  } else {
    datedClaims.forEach((c) => {
      md += `- **${c.createdAt}**: ${safeStr(c.text.slice(0, 100))}\n`;
    });
    md += `\n`;
  }

  if (findings.influence) {
    md += `## 05. Structural Influence (Hubs)\n\n`;
    if (findings.influence.status === "insufficient") {
      md += `> **Insufficient Data.** Minimum threshold not met.\n\n`;
    } else if (findings.influence.results.length > 0) {
      md += `| Rank | Entity | Degree |\n`;
      md += `|------|--------|--------|\n`;
      findings.influence.results
        .slice(0, 10)
        .forEach((res: InfluenceHubResult, i: number) => {
          const entity = pack.entities.find(
            (e: Entity) => e.id === res.entityId
          );
          md += `| ${i + 1} | ${safeStr(entity?.name || "Unknown")} | ${res.degree} |\n`;
        });
      md += `\n`;
    }
  }

  if (findings.funding) {
    md += `## 06. Financial Flows\n\n`;
    if (findings.funding.status === "insufficient") {
      md += `> **Insufficient Data.** Minimum threshold not met.\n\n`;
    } else if (findings.funding.concentration) {
      md += `### Top Funders\n`;
      findings.funding.funders
        .slice(0, 5)
        .forEach((f: FunderStat, i: number) => {
          const entity = pack.entities.find(
            (e: Entity) => e.id === f.entityId
          );
          md += `${i + 1}. **${safeStr(entity?.name || "Unknown")}** (${f.outgoingFundingEdges} outgoing)\n`;
        });
      md += `\n### Top Recipients\n`;
      findings.funding.recipients
        .slice(0, 5)
        .forEach((r: RecipientStat, i: number) => {
          const entity = pack.entities.find(
            (e: Entity) => e.id === r.entityId
          );
          md += `${i + 1}. **${safeStr(entity?.name || "Unknown")}** (${r.incomingFundingEdges} incoming)\n`;
        });
      md += `\n`;
    }
  }

  if (findings.enforcement) {
    md += `## 07. Gatekeeping & Enforcement\n\n`;
    if (findings.enforcement.status === "insufficient") {
      md += `> **Insufficient Data.** Minimum threshold not met.\n\n`;
    } else if (findings.enforcement.enforcers.length > 0) {
      md += `### Enforcers\n`;
      findings.enforcement.enforcers
        .slice(0, 5)
        .forEach((e: EnforcerStat) => {
          const entity = pack.entities.find(
            (ent: Entity) => ent.id === e.entityId
          );
          md += `- **${safeStr(entity?.name || "Unknown")}**: ${e.enforcementActions} actions\n`;
        });
      md += `\n### Targets\n`;
      findings.enforcement.targets
        .slice(0, 5)
        .forEach((t: TargetStat) => {
          const entity = pack.entities.find(
            (ent: Entity) => ent.id === t.entityId
          );
          md += `- **${safeStr(entity?.name || "Unknown")}**: ${t.targetedActions} instances\n`;
        });
      md += `\n`;
    }
  }

  md += `## Question Queue\n\n`;
  md += `*Open questions requiring further reporting or corroboration.*\n\n`;

  md += `## Sources Index\n\n`;
  const sortedEvidence = [...pack.evidence].sort((a, b) => a.id.localeCompare(b.id));
  if (sortedEvidence.length === 0) {
    md += `*No evidence sources recorded.*\n\n`;
  } else {
    sortedEvidence.forEach((ev, i) => {
      md += `${i + 1}. **${safeStr(ev.title)}** [${ev.sourceType}] (${ev.date})${ev.url ? ` — [Link](${ev.url})` : ""}\n`;
    });
    md += `\n`;
  }

  md += `---\n*Generated by Lantern — Evidence-First Workbench. Refuses unsupported claims.*\n`;

  return md;
}
