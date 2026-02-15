import type { Pack } from "@/lib/schema/pack_v1";

const safeStr = (str: string): string =>
  str.replace(/\|/g, "\\|").replace(/`/g, "\\`");

export function renderNewsroomOnePager(
  pack: Pack,
  reportHash: string,
  createdAt: string
): string {
  const unsourced = pack.claims.filter((c) => c.evidenceIds.length === 0);
  const verified = pack.claims.filter((c) => c.evidenceIds.length > 0);
  const topClaims = [...verified]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
  const topRisks = [...unsourced].slice(0, 5);

  let md = `# ${safeStr(pack.subjectName)} — Editor One-Pager
**Pack ID:** \`${pack.packId}\` | **Fingerprint:** \`${reportHash.slice(0, 16)}…\` | **Date:** ${createdAt.split("T")[0]}
**Lens:** Newsroom

---

## At a Glance

* **Total Claims:** ${pack.claims.length}
* **Verified (sourced):** ${verified.length}
* **Unsourced:** ${unsourced.length}
* **Evidence Items:** ${pack.evidence.length}
* **Entities:** ${pack.entities.length}

`;

  md += `## Top Verified Claims\n\n`;
  if (topClaims.length === 0) {
    md += `*No verified claims.*\n\n`;
  } else {
    topClaims.forEach((c, i) => {
      md += `${i + 1}. ${safeStr(c.text.slice(0, 120))} — *${(c.confidence * 100).toFixed(0)}% confidence, ${c.evidenceIds.length} source(s)*\n`;
    });
    md += `\n`;
  }

  md += `## Top Risks (Unsourced)\n\n`;
  if (topRisks.length === 0) {
    md += `*All claims have at least one source.*\n\n`;
  } else {
    topRisks.forEach((c, i) => {
      md += `${i + 1}. ${safeStr(c.text.slice(0, 120))}\n`;
    });
    md += `\n`;
  }

  md += `## Question Queue\n\n`;
  md += `*Open questions requiring further reporting or corroboration.*\n\n`;

  md += `---\n*Lantern — Evidence-First Workbench. No source, no assertion.*\n`;

  return md;
}
