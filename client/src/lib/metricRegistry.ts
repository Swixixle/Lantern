/**
 * Metric Registry - Central Source of Truth for All Heuristic Metadata
 * 
 * This registry provides disclaimer metadata for all analytical metrics
 * displayed in Lantern. Every heuristic visualization MUST reference
 * a metric from this registry to satisfy Legal Trust Boundary v1.0.
 * 
 * Required by Legal Hardening Sprint v1.0
 */

import { MetricMetadata } from "@/components/HeuristicDisclaimerOverlay";

/**
 * Comprehensive metric registry for all heuristic outputs.
 * 
 * Guidelines:
 * - metric_name: Clear, non-technical display name
 * - metric_type: Classification (e.g., "Graph Centrality", "Statistical Model")
 * - formula_reference: Algorithm or mathematical basis
 * - disclaimer: Legal disclaimer explaining limitations and proper use
 */
export const METRIC_REGISTRY: Record<string, MetricMetadata> = {
  // === INVESTIGATIVE HEURISTICS (Dossier/Evidence Analysis) ===
  
  influenceHubs: {
    metric_name: "Influence Hubs",
    metric_type: "Document Network Centrality",
    formula_reference: "PageRank-style eigenvector centrality on entity mention graph",
    disclaimer: "This metric measures document-derived network position and does not determine actual influence, authority, or power. It reflects co-occurrence patterns in analyzed documents only.",
  },
  
  fundingGravity: {
    metric_name: "Funding Gravity",
    metric_type: "Graph-Derived Centrality Metric",
    formula_reference: "Σ(weighted inbound and outbound financial edges)",
    disclaimer: "This metric reflects funding relationships mentioned in documents and does not establish legal responsibility, actual financial flows, or impropriety. Document-derived patterns do not constitute evidence of wrongdoing.",
  },
  
  enforcementMap: {
    metric_name: "Enforcement Mapping",
    metric_type: "Heuristic Pattern Match",
    formula_reference: "Keyword frequency × regulatory document proximity",
    disclaimer: "This metric identifies potential enforcement patterns from document language and does not predict actual legal outcomes, determine liability, or establish regulatory violations.",
  },
  
  temporalDensity: {
    metric_name: "Temporal Density",
    metric_type: "Time-Series Event Clustering",
    formula_reference: "Kernel density estimation over event timestamps extracted from documents",
    disclaimer: "This metric shows document-mentioned time patterns and does not establish actual timelines, causation, or sequence of events. Document dates may not reflect real-world chronology.",
  },
  
  networkCentrality: {
    metric_name: "Network Centrality",
    metric_type: "Graph Topology Metric",
    formula_reference: "Degree centrality, betweenness centrality, or closeness centrality on entity graph",
    disclaimer: "This metric quantifies position in document-derived networks and does not determine actual relationships, influence, or organizational structure. Graph topology does not imply causation or coordination.",
  },
  
  sensitivity: {
    metric_name: "Sensitivity Analysis",
    metric_type: "Claim Robustness Heuristic",
    formula_reference: "Robustness = 1 - (unsupported_claims / total_claims); measures evidence support",
    disclaimer: "This metric estimates how well claims are supported by evidence anchors in the current document set. It does not validate claim accuracy, legal merit, or factual truth. High robustness means claims have multiple document references, not that claims are true.",
  },
  
  // === COMPARATIVE ANALYSIS ===
  
  comparisonDelta: {
    metric_name: "Comparative Delta",
    metric_type: "Difference Analysis Metric",
    formula_reference: "delta = metric_value[dossier_A] - metric_value[dossier_B]",
    disclaimer: "This metric shows differences between two analytical models and does not determine which model is more accurate, legally sound, or factually correct. Differences reflect modeling choices, not objective truth.",
  },
  
  gapVisualization: {
    metric_name: "Gap Visualization",
    metric_type: "Comparative Overlap Metric",
    formula_reference: "Measures entity/claim overlap and divergence between two dossiers",
    disclaimer: "This visualization shows structural differences in document-derived models and does not determine which dossier is more complete, accurate, or legally defensible. Gaps may reflect incomplete extraction, not missing evidence.",
  },
  
  // === FINANCIAL SOVEREIGNTY (Planning) ===
  
  savingsProjection: {
    metric_name: "Savings Trajectory",
    metric_type: "Financial Projection Model",
    formula_reference: "cumulative_savings[t] = savings[t-1] + (revenue[t] - expenses[t] - taxes[t])",
    disclaimer: "This projection is a mathematical model based on input assumptions. It does not constitute financial advice, guarantee future outcomes, or account for market volatility, economic changes, or unforeseen circumstances.",
  },
  
  cashflowAnalysis: {
    metric_name: "Cashflow Analysis",
    metric_type: "Revenue & Expense Flow Model",
    formula_reference: "net_cashflow[t] = gross_revenue[t] - personal_draw[t] - operating_expenses[t] - estimated_taxes[t]",
    disclaimer: "This analysis is based on projected values and simplified tax calculations. Actual cashflow will vary based on business performance, market conditions, and tax obligations. Consult with financial and tax professionals for accurate planning.",
  },
  
  fundingGap: {
    metric_name: "Funding Gap Projection",
    metric_type: "Goal-Tracking Heuristic",
    formula_reference: "gap[t] = target_amount - cumulative_savings[t]",
    disclaimer: "This gap calculation is based on static targets and projected savings. Real-world factors including housing market changes, interest rates, and personal circumstances will affect actual requirements. This is not financial advice.",
  },
  
  trajectoryVisualization: {
    metric_name: "Sovereignty Trajectory",
    metric_type: "Multi-Dimensional Financial Projection",
    formula_reference: "Composite visualization of revenue, savings, and draw over 5-year horizon",
    disclaimer: "This trajectory represents a simplified projection model. It does not account for inflation, market conditions, competitive factors, or personal circumstances. Use as a planning tool, not a prediction or guarantee.",
  },
  
  // === CLAIM QUALITY & EVIDENCE ===
  
  evidenceDensity: {
    metric_name: "Evidence Density",
    metric_type: "Document Support Metric",
    formula_reference: "density = supporting_evidence_count / claim",
    disclaimer: "This metric measures quantity of document references, not quality of evidence. High density does not validate claim accuracy or legal merit. Multiple weak sources do not constitute strong evidence.",
  },
  
  claimConfidence: {
    metric_name: "Claim Confidence Score",
    metric_type: "Extraction Confidence Heuristic",
    formula_reference: "Confidence derived from NLP extraction scores, evidence count, and text clarity",
    disclaimer: "This score reflects automated extraction confidence, not factual accuracy or legal validity. High confidence means clear document language and strong extraction signals, not verified truth.",
  },
  
  // === LEGACY COMPATIBILITY (from METRIC_LIBRARY) ===
  
  influence: {
    metric_name: "Influence Score",
    metric_type: "Document Network Centrality",
    formula_reference: "PageRank-style eigenvector centrality on entity mention graph",
    disclaimer: "This metric measures document-derived importance and does not determine actual influence or authority.",
  },
  
  enforcement: {
    metric_name: "Enforcement Likelihood",
    metric_type: "Heuristic Pattern Match",
    formula_reference: "Keyword frequency × regulatory document proximity",
    disclaimer: "This metric identifies potential enforcement patterns and does not predict actual legal outcomes.",
  },
};

/**
 * Legacy export for backwards compatibility.
 * New code should use METRIC_REGISTRY directly.
 */
export const METRIC_LIBRARY = {
  fundingGravity: METRIC_REGISTRY.fundingGravity,
  influence: METRIC_REGISTRY.influence,
  enforcement: METRIC_REGISTRY.enforcement,
  temporalDensity: METRIC_REGISTRY.temporalDensity,
};

/**
 * Sovereignty metrics (re-export for backwards compatibility)
 */
export const SOVEREIGNTY_METRICS = {
  savingsProjection: METRIC_REGISTRY.savingsProjection,
  cashflowAnalysis: METRIC_REGISTRY.cashflowAnalysis,
  fundingGap: METRIC_REGISTRY.fundingGap,
  trajectoryVisualization: METRIC_REGISTRY.trajectoryVisualization,
};
