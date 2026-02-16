/**
 * Sovereignty Dashboard Metric Metadata
 * 
 * Defines disclaimer metadata for financial sovereignty planning metrics.
 * These are heuristic projections, not financial advice.
 */

import { MetricMetadata } from "@/components/HeuristicDisclaimerOverlay";

/**
 * Metric library for sovereignty planning dashboard
 */
export const SOVEREIGNTY_METRICS: Record<string, MetricMetadata> = {
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
};
