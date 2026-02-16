/**
 * Refusal Threshold System
 * 
 * Implements evidence density checks to prevent low-confidence claims
 * from being automatically mapped. Requires explicit user assertion
 * when evidence is insufficient.
 * 
 * Required by Legal Trust Boundary v1.0
 */

/**
 * Evidence density assessment result.
 */
export interface EvidenceDensityCheck {
  /** Whether automatic mapping is allowed */
  allow_automatic: boolean;
  
  /** Number of supporting evidence pieces */
  support_count: number;
  
  /** Minimum required for automatic mapping */
  minimum_required: number;
  
  /** Human-readable reason if refused */
  refusal_reason?: string;
}

/**
 * User override for low-density evidence.
 */
export interface UserOverride {
  /** User ID who made the override */
  user_id: string;
  
  /** ISO8601 timestamp of override */
  overridden_at: string;
  
  /** Optional justification */
  justification?: string;
}

/**
 * Check if evidence density meets threshold for automatic mapping.
 * 
 * Default threshold: 2 supporting pieces of evidence.
 * 
 * @param supportCount - Number of evidence pieces supporting the claim
 * @param threshold - Minimum required (default: 2)
 * @returns Density check result
 */
export function checkEvidenceDensity(
  supportCount: number,
  threshold: number = 2
): EvidenceDensityCheck {
  const allowAutomatic = supportCount >= threshold;
  
  return {
    allow_automatic: allowAutomatic,
    support_count: supportCount,
    minimum_required: threshold,
    refusal_reason: allowAutomatic
      ? undefined
      : `Insufficient evidence density. Found ${supportCount} supporting pieces, need at least ${threshold}.`,
  };
}

/**
 * Generate a user override record.
 * 
 * @param userId - User making the override
 * @param justification - Optional reason for override
 * @returns Override record
 */
export function createUserOverride(
  userId: string,
  justification?: string
): UserOverride {
  return {
    user_id: userId,
    overridden_at: new Date().toISOString(),
    justification,
  };
}

/**
 * Confidence level categorization.
 */
export type ConfidenceLevel = "high" | "medium" | "low" | "insufficient";

/**
 * Categorize confidence score into levels.
 * 
 * @param confidence - Confidence score (0-1)
 * @returns Confidence level category
 */
export function categorizeConfidence(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.6) return "medium";
  if (confidence >= 0.4) return "low";
  return "insufficient";
}

/**
 * Check if claim requires user assertion due to low confidence.
 * 
 * @param confidence - Confidence score (0-1)
 * @param evidenceCount - Number of supporting evidence pieces
 * @returns Whether user assertion is required
 */
export function requiresUserAssertion(
  confidence: number,
  evidenceCount: number
): { required: boolean; reason: string } {
  const level = categorizeConfidence(confidence);
  const densityCheck = checkEvidenceDensity(evidenceCount);
  
  if (!densityCheck.allow_automatic) {
    return {
      required: true,
      reason: densityCheck.refusal_reason!,
    };
  }
  
  if (level === "insufficient" || level === "low") {
    return {
      required: true,
      reason: `Confidence level is ${level} (${(confidence * 100).toFixed(1)}%). Human assertion required.`,
    };
  }
  
  return {
    required: false,
    reason: "",
  };
}
