import type { Lens } from "@/context/LensContext";

export type PostureLevel = "DRAFT" | "HIGH_RISK" | "REVIEW_REQUIRED" | "EVIDENCE_STRONG";

export interface PostureResult {
  level: PostureLevel;
  label: string;
  color: "gray" | "red" | "amber" | "emerald";
  actions: string[];
}

interface PostureCounts {
  defensible: number;
  restricted: number;
  ambiguous: number;
}

const NEWSROOM_LABELS: Record<PostureLevel, string> = {
  DRAFT: "Draft",
  HIGH_RISK: "High Risk",
  REVIEW_REQUIRED: "Review Required",
  EVIDENCE_STRONG: "Evidence Strong",
};

const LEGAL_LABELS: Record<PostureLevel, string> = {
  DRAFT: "Preliminary",
  HIGH_RISK: "Exposure Risk",
  REVIEW_REQUIRED: "Attorney Review",
  EVIDENCE_STRONG: "Supportable",
};

const LEVEL_COLORS: Record<PostureLevel, PostureResult["color"]> = {
  DRAFT: "gray",
  HIGH_RISK: "red",
  REVIEW_REQUIRED: "amber",
  EVIDENCE_STRONG: "emerald",
};

function buildActions(counts: PostureCounts, lens: Lens): string[] {
  const actions: string[] = [];
  const isLegal = lens === "legal";

  if (counts.restricted > 0) {
    const noun = isLegal ? "unsubstantiated assertions" : "unsourced claims";
    actions.push(
      `Address ${counts.restricted} ${noun} by adding corroborating sources or removing from narrative.`
    );
  }

  if (counts.ambiguous > 0) {
    const noun = isLegal ? "disputed assertions" : "contestable claims";
    actions.push(
      `Resolve ${counts.ambiguous} ${noun} by adding disambiguating evidence.`
    );
  }

  const total = counts.defensible + counts.restricted + counts.ambiguous;
  if (total > 0 && counts.defensible / total < 0.7) {
    const pct = Math.round((counts.defensible / total) * 100);
    const target = isLegal ? "supportable" : "verified";
    actions.push(
      `Coverage at ${pct}% — increase ${target} ratio above 70% for stronger posture.`
    );
  }

  if (actions.length === 0) {
    actions.push(
      isLegal
        ? "Record meets minimum evidentiary thresholds. Continue monitoring for new evidence."
        : "Evidence coverage is strong. Continue monitoring for new developments."
    );
  }

  return actions.slice(0, 3);
}

export function computePosture(counts: PostureCounts, lens: Lens): PostureResult {
  const total = counts.defensible + counts.restricted + counts.ambiguous;
  const coverageRatio = total > 0 ? counts.defensible / total : 0;
  const labels = lens === "legal" ? LEGAL_LABELS : NEWSROOM_LABELS;

  let level: PostureLevel;

  if (total < 5) {
    level = "DRAFT";
  } else if (counts.restricted >= 5 || coverageRatio < 0.4) {
    level = "HIGH_RISK";
  } else if (counts.ambiguous >= 3 || coverageRatio < 0.7) {
    level = "REVIEW_REQUIRED";
  } else {
    level = "EVIDENCE_STRONG";
  }

  return {
    level,
    label: labels[level],
    color: LEVEL_COLORS[level],
    actions: buildActions(counts, lens),
  };
}

export function postureLineForExport(counts: PostureCounts, lens: Lens): string {
  const result = computePosture(counts, lens);
  const lensLabel = lens === "legal" ? "Legal" : "Newsroom";
  return `**Posture (${lensLabel}):** ${result.label}`;
}
