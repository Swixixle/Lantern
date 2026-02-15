import type { Pack } from "@/lib/schema/pack_v1";

const safeStr = (str: string): string =>
  str.replace(/\|/g, "\\|").replace(/`/g, "\\`");

export function renderLegalOnePager(
  pack: Pack,
  reportHash: string,
  createdAt: string
): string {
  const unsupported = pack.claims.filter((c) => c.evidenceIds.length === 0);
  const supported = pack.claims.filter((c) => c.evidenceIds.length > 0);
  const topAssertions = [...supported]
    .sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id))
    .slice(0, 10);
  const topRisks = [...unsupported].slice(0, 5);

  let md = `# IN RE: ${safeStr(pack.subjectName)} — Counsel One-Pager
**Dossier ID:** \`${pack.packId}\` | **Integrity Fingerprint:** \`${reportHash.slice(0, 16)}…\` | **Date:** ${createdAt.split("T")[0]}
**Lens:** Legal

---

## Summary

* **Total Assertions:** ${pack.claims.length}
* **Supported:** ${supported.length}
* **Unsubstantiated:** ${unsupported.length}
* **Exhibits Referenced:** ${pack.evidence.length}
* **Parties:** ${pack.entities.length}

`;

  md += `## Principal Supported Assertions\n\n`;
  if (topAssertions.length === 0) {
    md += `*No supported assertions in the record.*\n\n`;
  } else {
    topAssertions.forEach((c, i) => {
      md += `${i + 1}. ${safeStr(c.text.slice(0, 120))} — *${(c.confidence * 100).toFixed(0)}% evidentiary confidence, ${c.evidenceIds.length} exhibit(s)*\n`;
    });
    md += `\n`;
  }

  md += `## Exposure Risks (Unsubstantiated)\n\n`;
  if (topRisks.length === 0) {
    md += `*All assertions have at least one evidentiary reference.*\n\n`;
  } else {
    topRisks.forEach((c, i) => {
      md += `${i + 1}. ${safeStr(c.text.slice(0, 120))}\n`;
    });
    md += `\n`;
  }

  md += `## Required Corroboration\n\n`;
  md += `*Items requiring additional evidence, witness statements, or documentary support.*\n\n`;

  md += `---\n*Prepared using Lantern — Evidence-First Workbench. Refuses unsupported assertions.*\n`;

  return md;
}
