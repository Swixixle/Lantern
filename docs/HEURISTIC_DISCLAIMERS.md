# Heuristic Disclaimer System Documentation

## Overview

The Lantern Heuristic Disclaimer System provides legal protection for analytical metrics by ensuring they are never presented as factual determinations or legal verdicts. This system is a core component of Lantern's Legal Trust Boundary v1.0.

## Purpose

Lantern generates analytical metrics (heuristics) from documents, such as:
- Funding flow centrality scores
- Influence measurements
- Temporal event density
- Evidence strength assessments
- Financial projections

**Critical distinction:** These metrics are *analytical tools* derived from document patterns, not statements of fact or legal conclusions.

The disclaimer system ensures users understand:
1. What the metric calculates (formula/algorithm)
2. What the metric means (interpretation)
3. What the metric does NOT prove (limitations)
4. How to use it properly (investigative leads, not evidence)

## Components

### 1. HeuristicDisclaimerOverlay Component

A React component that wraps analytical visualizations with mandatory disclaimers.

**Location:** `client/src/components/HeuristicDisclaimerOverlay.tsx`

#### Usage

```tsx
import { HeuristicDisclaimerOverlay, METRIC_LIBRARY } from "@/components/HeuristicDisclaimerOverlay";

// Wrap any heuristic chart or metric display
<HeuristicDisclaimerOverlay 
  metadata={METRIC_LIBRARY.fundingGravity}
  inline={true}
>
  <FundingGravityChart data={data} />
</HeuristicDisclaimerOverlay>
```

#### Props

- `metadata: MetricMetadata` - Metric information (name, formula, disclaimer)
- `children: React.ReactNode` - The visualization to wrap
- `inline?: boolean` - Display as inline banner (true) or overlay (false)
- `className?: string` - Additional CSS classes

#### Display Modes

**Inline Mode** (`inline={true}`):
- Displays a compact banner above the chart
- Includes "Learn More" link to detailed modal
- Best for dashboard views with multiple metrics

**Overlay Mode** (`inline={false}`):
- Full overlay banner at top
- Persistent "Details" button
- Bottom disclaimer always visible
- Best for dedicated analytical views

### 2. MetricMetadata Interface

Defines the structure for metric documentation:

```typescript
interface MetricMetadata {
  metric_name: string;         // Display name
  metric_type: string;          // Category (e.g., "Graph-Derived Centrality")
  formula_reference: string;    // Algorithm description
  disclaimer: string;           // Legal disclaimer text
}
```

### 3. METRIC_LIBRARY

Predefined metadata for common heuristics:

```typescript
export const METRIC_LIBRARY: Record<string, MetricMetadata> = {
  fundingGravity: {
    metric_name: "Funding Gravity",
    metric_type: "Graph-Derived Centrality Metric",
    formula_reference: "Σ(weighted inbound financial edges)",
    disclaimer: "This metric reflects document co-occurrence patterns and does not establish legal responsibility.",
  },
  
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
  
  temporalDensity: {
    metric_name: "Temporal Density",
    metric_type: "Time-Series Event Clustering",
    formula_reference: "Kernel density estimation over event timestamps",
    disclaimer: "This metric shows document-mentioned time patterns and does not establish actual timelines or causation.",
  },
};
```

### 4. EvidenceDensityWarning Component

Prompts users when automatic claim mapping is refused due to insufficient evidence.

**Location:** `client/src/components/EvidenceDensityWarning.tsx`

#### Usage

```tsx
import { EvidenceDensityWarning } from "@/components/EvidenceDensityWarning";

<EvidenceDensityWarning
  evidenceCount={1}
  confidence={0.35}
  onUserAssert={(justification) => {
    // Handle user assertion
    console.log("User justified low-evidence claim:", justification);
  }}
  onCancel={() => {
    // Handle cancellation
    console.log("User declined to assert claim");
  }}
  variant="dialog"
  open={showWarning}
/>
```

#### Props

- `evidenceCount: number` - Number of supporting evidence pieces
- `confidence: number` - Confidence score (0-1)
- `onUserAssert: (justification: string) => void` - Callback when user asserts
- `onCancel: () => void` - Callback when user cancels
- `variant?: "dialog" | "inline"` - Display style
- `open?: boolean` - Dialog visibility (for dialog variant)

### 5. Refusal Threshold System

Backend logic to determine when user assertion is required.

**Location:** `client/src/lib/refusalThreshold.ts`

#### Key Functions

**checkEvidenceDensity()**

Checks if evidence meets the threshold for automatic mapping.

```typescript
function checkEvidenceDensity(
  supportCount: number,
  threshold: number = 2
): EvidenceDensityCheck
```

Default threshold: **2 supporting pieces of evidence**

**categorizeConfidence()**

Categorizes confidence scores into levels:

- `high`: ≥ 0.8
- `medium`: 0.6 - 0.79
- `low`: 0.4 - 0.59
- `insufficient`: < 0.4

**requiresUserAssertion()**

Determines if a claim requires user assertion.

```typescript
function requiresUserAssertion(
  confidence: number,
  evidenceCount: number
): { required: boolean; reason: string }
```

Returns `required: true` if:
- Evidence count < 2, OR
- Confidence level is "low" or "insufficient"

**createUserOverride()**

Generates a user override record for low-density claims:

```typescript
interface UserOverride {
  user_id: string;
  overridden_at: string; // ISO 8601
  justification?: string;
}
```

## Legal Requirements

### Mandatory Disclosure

Every heuristic view **MUST**:
1. Display the metric name clearly
2. Provide access to formula/algorithm
3. Show legal disclaimer text
4. Offer "Learn More" option for details

### Proper Framing

Disclaimers must communicate:
- **What it IS**: A calculated value based on document analysis
- **What it IS NOT**: Evidence of guilt, liability, or legal truth
- **Proper use**: Investigative leads, analytical insights
- **Improper use**: Standalone evidence, determinations of fact

### User Acknowledgment

For low-confidence claims:
- System refuses automatic mapping
- User must explicitly assert claim validity
- User must provide justification
- Override is recorded in audit trail

## Implementation Guide

### Adding a New Heuristic Metric

1. **Define metadata** in metric library:

```typescript
// In METRIC_LIBRARY or custom library
export const MY_METRICS = {
  customMetric: {
    metric_name: "Custom Analysis Metric",
    metric_type: "Statistical Aggregation",
    formula_reference: "mean(values) / stddev(values)",
    disclaimer: "This metric is a statistical summary and does not establish factual accuracy.",
  },
};
```

2. **Wrap visualization component**:

```tsx
import { HeuristicDisclaimerOverlay } from "@/components/HeuristicDisclaimerOverlay";
import { MY_METRICS } from "@/lib/myMetrics";

export function CustomAnalysisChart({ data }) {
  return (
    <HeuristicDisclaimerOverlay metadata={MY_METRICS.customMetric} inline>
      <Chart data={data} />
    </HeuristicDisclaimerOverlay>
  );
}
```

3. **Add confidence checks** (if applicable):

```typescript
import { requiresUserAssertion } from "@/lib/refusalThreshold";

const { required, reason } = requiresUserAssertion(confidence, evidenceCount);
if (required) {
  setShowWarning(true);
  setWarningReason(reason);
}
```

### Sovereignty Dashboard Example

The sovereignty planning dashboard uses disclaimers for financial projections:

**File:** `client/src/lib/sovereigntyMetrics.ts`

```typescript
export const SOVEREIGNTY_METRICS = {
  savingsProjection: {
    metric_name: "Savings Trajectory",
    metric_type: "Financial Projection Model",
    formula_reference: "cumulative_savings[t] = savings[t-1] + (revenue[t] - expenses[t] - taxes[t])",
    disclaimer: "This projection is a mathematical model based on input assumptions. It does not constitute financial advice...",
  },
  // ... more metrics
};
```

**Integration:**

```tsx
// In SavingsChart.tsx
import { HeuristicDisclaimerOverlay } from "./HeuristicDisclaimerOverlay";
import { SOVEREIGNTY_METRICS } from "@/lib/sovereigntyMetrics";

export function SavingsChart({ data }) {
  return (
    <HeuristicDisclaimerOverlay metadata={SOVEREIGNTY_METRICS.savingsProjection} inline>
      <Card>
        {/* Chart content */}
      </Card>
    </HeuristicDisclaimerOverlay>
  );
}
```

## User Experience

### For Analysts

When viewing a heuristic:
1. See chart/metric with inline banner disclaimer
2. Click "Learn More" to see detailed formula
3. Understand metric is analytical, not factual
4. Use as investigative lead, not evidence

### For Investigators

When creating low-confidence claims:
1. System detects insufficient evidence/confidence
2. Warning dialog appears
3. User must provide justification to proceed
4. Override is logged for audit trail
5. Claim is marked as USER_ASSERTED (not SYSTEM_DERIVED)

## Best Practices

### DO

✅ Wrap **all** heuristic visualizations with disclaimers
✅ Use inline mode for dashboards
✅ Use overlay mode for dedicated analysis pages
✅ Provide clear formula references
✅ Keep disclaimer text concise but legally sufficient
✅ Log all user overrides for compliance

### DON'T

❌ Display heuristics without disclaimers
❌ Present metrics as "findings" or "conclusions"
❌ Auto-accept low-confidence claims
❌ Hide formula/algorithm details
❌ Use technical jargon in disclaimers
❌ Skip user justification for overrides

## Compliance

### Legal Trust Boundary v1.0

The disclaimer system fulfills requirements:
- ✅ Metric labeling with formula references
- ✅ Mandatory analytical view banners
- ✅ "Learn More" disclosure modals
- ✅ Refusal threshold for low-confidence claims
- ✅ User override tracking with justifications

### Audit Trail

All interactions are logged:
- Metric views (optional analytics)
- "Learn More" modal opens
- User assertion overrides
- Override justifications

## Testing

### Unit Tests

Test refusal threshold logic:

```typescript
import { checkEvidenceDensity, requiresUserAssertion } from "@/lib/refusalThreshold";

describe("Refusal Threshold", () => {
  it("should refuse mapping with insufficient evidence", () => {
    const result = checkEvidenceDensity(1, 2);
    expect(result.allow_automatic).toBe(false);
  });
  
  it("should require assertion for low confidence", () => {
    const { required } = requiresUserAssertion(0.3, 3);
    expect(required).toBe(true);
  });
});
```

### Integration Tests

Verify disclaimer display:

```typescript
import { render, screen } from "@testing-library/react";
import { HeuristicDisclaimerOverlay, METRIC_LIBRARY } from "@/components/HeuristicDisclaimerOverlay";

it("should display disclaimer banner", () => {
  render(
    <HeuristicDisclaimerOverlay metadata={METRIC_LIBRARY.fundingGravity} inline>
      <div>Chart Content</div>
    </HeuristicDisclaimerOverlay>
  );
  
  expect(screen.getByText(/Funding Gravity/i)).toBeInTheDocument();
  expect(screen.getByText(/Not a legal determination/i)).toBeInTheDocument();
});
```

## Troubleshooting

### Issue: Disclaimer not displaying

**Causes:**
1. Component not wrapped with `HeuristicDisclaimerOverlay`
2. Missing metadata import

**Solution:**
```tsx
import { HeuristicDisclaimerOverlay } from "@/components/HeuristicDisclaimerOverlay";
import { METRIC_LIBRARY } from "@/components/HeuristicDisclaimerOverlay";

<HeuristicDisclaimerOverlay metadata={METRIC_LIBRARY.yourMetric} inline>
  <YourChart />
</HeuristicDisclaimerOverlay>
```

### Issue: User assertions not saving

**Cause:** Missing override handler

**Solution:**
```tsx
onUserAssert={(justification) => {
  const override = createUserOverride(userId, justification);
  await saveClaim({ 
    ...claim, 
    assertion_type: "USER_ASSERTED",
    user_override: override 
  });
}}
```

### Issue: Threshold too strict/lenient

**Solution:** Adjust thresholds in `refusalThreshold.ts`:

```typescript
// Default threshold is 2, adjust as needed
const densityCheck = checkEvidenceDensity(supportCount, 3); // Require 3 pieces

// Adjust confidence levels
export function categorizeConfidence(confidence: number): ConfidenceLevel {
  if (confidence >= 0.85) return "high"; // Stricter
  if (confidence >= 0.70) return "medium";
  if (confidence >= 0.50) return "low";
  return "insufficient";
}
```

## References

- Federal Rules of Evidence, Rule 702 (Expert Testimony)
- Model Rules of Professional Conduct 3.3 (Candor)
- Daubert Standard (Admissibility of Scientific Evidence)
- NIST Guidelines for Analytical Disclosure

## Future Enhancements

- Configurable threshold levels per organization
- Multi-language disclaimer support
- Accessibility improvements (ARIA labels)
- Analytics dashboard for metric usage patterns
- A/B testing for disclaimer effectiveness
