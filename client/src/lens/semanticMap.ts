import type { Lens } from "@/context/LensContext";

export interface SemanticLabels {
  claimStatus: {
    DEFENSIBLE: string;
    RESTRICTED: string;
    AMBIGUOUS: string;
  };
  sectionTitles: {
    claimSpace: string;
    defensibleClaims: string;
    restrictedClaims: string;
    ambiguousClaims: string;
    unknownInventory: string;
    questionQueue: string;
    claimsLedger: string;
    verifiedRecord: string;
    evidencePacket: string;
    constraints: string;
  };
  riskPosture: {
    draft: string;
    reviewRequired: string;
    evidenceStrong: string;
    highRisk: string;
  };
  exportLabel: string;
  refusalLabel: string;
  notSupportedPrefix: string;
}

const newsroomLabels: SemanticLabels = {
  claimStatus: {
    DEFENSIBLE: "VERIFIED",
    RESTRICTED: "UNSOURCED",
    AMBIGUOUS: "CONTESTABLE",
  },
  sectionTitles: {
    claimSpace: "Claim Space",
    defensibleClaims: "Verified Claims",
    restrictedClaims: "Unsourced Claims",
    ambiguousClaims: "Contestable Claims",
    unknownInventory: "Unknown Inventory",
    questionQueue: "Question Queue",
    claimsLedger: "Claims Ledger",
    verifiedRecord: "Editor Review Packet",
    evidencePacket: "Evidence Packet",
    constraints: "Constraints & Friction",
  },
  riskPosture: {
    draft: "Draft",
    reviewRequired: "Review Required",
    evidenceStrong: "Evidence Strong",
    highRisk: "High Risk",
  },
  exportLabel: "Editor Review Packet",
  refusalLabel: "Not supported by corpus",
  notSupportedPrefix: "Not supported by corpus: ",
};

const legalLabels: SemanticLabels = {
  claimStatus: {
    DEFENSIBLE: "SUPPORTED",
    RESTRICTED: "UNSUBSTANTIATED",
    AMBIGUOUS: "IN DISPUTE",
  },
  sectionTitles: {
    claimSpace: "Factual Assertions Space",
    defensibleClaims: "Supported Assertions",
    restrictedClaims: "Unsubstantiated Assertions",
    ambiguousClaims: "Assertions In Dispute",
    unknownInventory: "Unsupported / Unsubstantiated Assertions",
    questionQueue: "Open Issues / Required Corroboration",
    claimsLedger: "Factual Assertions Table",
    verifiedRecord: "Case Memorandum",
    evidencePacket: "Exhibit Packet",
    constraints: "Constraints & Limiting Factors",
  },
  riskPosture: {
    draft: "Preliminary",
    reviewRequired: "Attorney Review",
    evidenceStrong: "Supportable",
    highRisk: "Exposure Risk",
  },
  exportLabel: "Case Memorandum + Exhibit Index",
  refusalLabel: "Insufficient evidentiary basis",
  notSupportedPrefix: "Insufficient evidentiary basis: ",
};

export function getSemanticLabels(lens: Lens): SemanticLabels {
  return lens === "legal" ? legalLabels : newsroomLabels;
}

export function getClaimStatusLabel(
  classification: "DEFENSIBLE" | "RESTRICTED" | "AMBIGUOUS",
  lens: Lens
): string {
  return getSemanticLabels(lens).claimStatus[classification];
}
