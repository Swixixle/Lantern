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

const safeStr = (str: string): string =>
  str.replace(/\|/g, "\\|").replace(/`/g, "\\`");

export function renderLegalMarkdown(
  pack: Pack,
  findings: {
    influence: InfluenceHubsFinding | null;
    funding: FundingGravityFinding | null;
    enforcement: EnforcementMapFinding | null;
  },
  reportHash: string
): string {
  const date = new Date().toISOString().split("T")[0];

  let md = `---
title: "${safeStr(pack.subjectName)} - Case Memorandum"
date: ${date}
packId: ${pack.packId}
schemaVersion: ${pack.schemaVersion}
fingerprint: ${reportHash}
lens: legal
generatedBy: Lantern (Evidence-First Workbench)
---

# IN RE: ${safeStr(pack.subjectName)}
## Case Memorandum + Exhibit Index

**Dossier ID:** \`${pack.packId}\`
**Date of Preparation:** ${date}
**Integrity Fingerprint (SHA-256):** \`${reportHash}\`
**Lens:** Legal

> **Scope & Limitations**
> * This memorandum is a structured compilation of factual assertions and evidentiary references. It does not constitute legal advice or opinion.
> * All assertions are source-bound. No inference, synthesis, or conclusion has been drawn beyond what the cited evidence directly supports.
> * Evidentiary sufficiency assessments are preliminary and subject to attorney review.

`;

  md += `## I. Executive Summary\n\n`;
  const supported = pack.claims.filter((c) => c.claimType === "fact").length;
  const allegations = pack.claims.filter(
    (c) => c.claimType === "allegation"
  ).length;
  md += `* **Supported Assertions:** ${supported}\n`;
  md += `* **Allegations Under Review:** ${allegations}\n`;
  md += `* **Exhibits Referenced:** ${pack.evidence.length}\n`;
  md += `* **Relationships Documented:** ${pack.edges.length}\n\n`;

  md += `## II. Factual Assertions Table\n\n`;
  md += `| No. | Classification | Assertion | Evidentiary Confidence | Exhibits |\n`;
  md += `|-----|---------------|-----------|----------------------|----------|\n`;
  const sorted = [...pack.claims].sort(
    (a, b) => b.confidence - a.confidence
  );
  sorted.forEach((claim, i) => {
    const classification =
      claim.claimType === "fact"
        ? "Supported"
        : claim.claimType === "allegation"
          ? "Allegation"
          : claim.claimType === "inference"
            ? "Inference"
            : "Opinion";
    md += `| ${i + 1} | ${classification} | ${safeStr(claim.text.slice(0, 80))} | ${(claim.confidence * 100).toFixed(0)}% | ${claim.evidenceIds.length} |\n`;
  });
  md += `\n`;

  md += `## III. Chronology\n\n`;
  const datedClaims = pack.claims
    .filter((c) => c.createdAt)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (datedClaims.length === 0) {
    md += `*No chronological data available for this matter.*\n\n`;
  } else {
    datedClaims.forEach((c) => {
      md += `- **${c.createdAt}**: ${safeStr(c.text.slice(0, 100))}\n`;
    });
    md += `\n`;
  }

  if (findings.influence) {
    md += `## IV. Structural Relationships Analysis\n\n`;
    if (findings.influence.status === "insufficient") {
      md += `> **Insufficient Evidence.** The evidentiary record does not meet the minimum threshold for structural analysis.\n\n`;
    } else if (findings.influence.results.length > 0) {
      md += `| Rank | Party | Connection Degree |\n`;
      md += `|------|-------|------------------|\n`;
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
    md += `## V. Financial Flow Analysis\n\n`;
    if (findings.funding.status === "insufficient") {
      md += `> **Insufficient Evidence.** The evidentiary record does not support financial flow analysis.\n\n`;
    } else if (findings.funding.concentration) {
      md += `### Principal Funding Sources\n`;
      findings.funding.funders
        .slice(0, 5)
        .forEach((f: FunderStat, i: number) => {
          const entity = pack.entities.find(
            (e: Entity) => e.id === f.entityId
          );
          md += `${i + 1}. **${safeStr(entity?.name || "Unknown")}** (${f.outgoingFundingEdges} documented transfers)\n`;
        });
      md += `\n### Principal Recipients\n`;
      findings.funding.recipients
        .slice(0, 5)
        .forEach((r: RecipientStat, i: number) => {
          const entity = pack.entities.find(
            (e: Entity) => e.id === r.entityId
          );
          md += `${i + 1}. **${safeStr(entity?.name || "Unknown")}** (${r.incomingFundingEdges} documented receipts)\n`;
        });
      md += `\n`;
    }
  }

  if (findings.enforcement) {
    md += `## VI. Enforcement Actions & Regulatory Events\n\n`;
    if (findings.enforcement.status === "insufficient") {
      md += `> **Insufficient Evidence.** Enforcement data below minimum threshold.\n\n`;
    } else if (findings.enforcement.enforcers.length > 0) {
      md += `### Enforcing Parties\n`;
      findings.enforcement.enforcers
        .slice(0, 5)
        .forEach((e: EnforcerStat) => {
          const entity = pack.entities.find(
            (ent: Entity) => ent.id === e.entityId
          );
          md += `- **${safeStr(entity?.name || "Unknown")}**: ${e.enforcementActions} documented actions\n`;
        });
      md += `\n### Subject Parties\n`;
      findings.enforcement.targets
        .slice(0, 5)
        .forEach((t: TargetStat) => {
          const entity = pack.entities.find(
            (ent: Entity) => ent.id === t.entityId
          );
          md += `- **${safeStr(entity?.name || "Unknown")}**: ${t.targetedActions} documented instances\n`;
        });
      md += `\n`;
    }
  }

  md += `## VII. Unsupported / Unsubstantiated Assertions\n\n`;
  const unsupported = pack.claims.filter((c) => c.evidenceIds.length === 0);
  if (unsupported.length === 0) {
    md += `*All assertions have at least one evidentiary reference.*\n\n`;
  } else {
    unsupported.forEach((c, i) => {
      md += `${i + 1}. ${safeStr(c.text)}\n`;
    });
    md += `\n> **Note:** The above assertions lack sufficient evidentiary basis in the current record and should not be relied upon without further corroboration.\n\n`;
  }

  md += `## VIII. Open Issues / Required Corroboration\n\n`;
  md += `*Items requiring additional evidence, witness statements, or documentary support before any assertion can be deemed supportable.*\n\n`;

  md += `## IX. Exhibit Index\n\n`;
  if (pack.evidence.length === 0) {
    md += `*No exhibits referenced in this memorandum.*\n\n`;
  } else {
    md += `| Exhibit | Title | Type | Date | Reference |\n`;
    md += `|---------|-------|------|------|-----------|\n`;
    pack.evidence.forEach((ev, i) => {
      md += `| Ex. ${i + 1} | ${safeStr(ev.title)} | ${ev.sourceType} | ${ev.date} | ${ev.url ? `[Link](${ev.url})` : "On file"} |\n`;
    });
    md += `\n`;
  }

  md += `---\n*Prepared using Lantern — Evidence-First Workbench. This system refuses unsupported assertions and does not draw conclusions beyond the evidentiary record.*\n`;

  return md;
}
