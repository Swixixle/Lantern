/**
 * Heuristic Disclaimer Overlay Component
 * 
 * Legal protection for analytical metrics.
 * Ensures heuristics are never presented as verdicts.
 * 
 * Required by Legal Trust Boundary v1.0
 */

import { useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Metric metadata for disclaimer display.
 */
export interface MetricMetadata {
  /** Display name of the metric */
  metric_name: string;
  
  /** Classification of metric type */
  metric_type: string;
  
  /** Mathematical formula or algorithm description */
  formula_reference: string;
  
  /** Legal disclaimer text */
  disclaimer: string;
}

interface HeuristicDisclaimerOverlayProps {
  /** Metric metadata to display */
  metadata: MetricMetadata;
  
  /** Child content (the metric visualization) */
  children: React.ReactNode;
  
  /** Optional: Show as inline banner instead of overlay */
  inline?: boolean;
  
  /** Optional: Additional CSS classes */
  className?: string;
}

/**
 * Wraps heuristic visualizations with mandatory disclaimers.
 * 
 * Usage:
 * ```tsx
 * <HeuristicDisclaimerOverlay metadata={fundingGravityMetadata}>
 *   <FundingGravityChart data={data} />
 * </HeuristicDisclaimerOverlay>
 * ```
 */
export function HeuristicDisclaimerOverlay({
  metadata,
  children,
  inline = false,
  className = "",
}: HeuristicDisclaimerOverlayProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (inline) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Alert variant="default" className="bg-amber-50 border-amber-200">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>{metadata.metric_name}</strong> — Analytical metric. Not a legal determination.
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
              <DialogTrigger asChild>
                <Button variant="link" className="h-auto p-0 ml-1 text-xs">
                  Learn More
                </Button>
              </DialogTrigger>
              <MetricDetailsDialog metadata={metadata} />
            </Dialog>
          </AlertDescription>
        </Alert>
        {children}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Mandatory Banner */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-amber-50 to-transparent p-3 border-b border-amber-200">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-semibold text-amber-900">Analytical View</div>
            <div className="text-amber-800 text-xs mt-1">
              <strong>{metadata.metric_name}</strong> ({metadata.metric_type})
            </div>
          </div>
          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-shrink-0">
                <Info className="h-4 w-4 mr-1" />
                Details
              </Button>
            </DialogTrigger>
            <MetricDetailsDialog metadata={metadata} />
          </Dialog>
        </div>
      </div>

      {/* Content with top padding to clear banner */}
      <div className="pt-20">
        {children}
      </div>

      {/* Bottom Disclaimer (always visible) */}
      <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
        <strong>Legal Notice:</strong> Lantern provides analytical metrics derived from document structure. 
        It does not determine factual or legal truth.
      </div>
    </div>
  );
}

/**
 * Detailed metric information dialog.
 */
function MetricDetailsDialog({ metadata }: { metadata: MetricMetadata }) {
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Metric Details: {metadata.metric_name}</DialogTitle>
        <DialogDescription>
          Understanding analytical metrics and their limitations
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4 text-sm">
        <div>
          <h4 className="font-semibold text-slate-900 mb-1">Metric Type</h4>
          <p className="text-slate-600">{metadata.metric_type}</p>
        </div>
        
        <div>
          <h4 className="font-semibold text-slate-900 mb-1">Formula / Algorithm</h4>
          <code className="block p-2 bg-slate-100 rounded text-xs font-mono">
            {metadata.formula_reference}
          </code>
        </div>
        
        <div className="p-3 bg-amber-50 border border-amber-200 rounded">
          <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Important Disclaimer
          </h4>
          <p className="text-amber-800 text-xs leading-relaxed">
            {metadata.disclaimer}
          </p>
        </div>
        
        <div className="text-xs text-slate-500 space-y-2">
          <p>
            <strong>What this metric IS:</strong> A calculated value based on document structure, 
            co-occurrence patterns, or graph topology.
          </p>
          <p>
            <strong>What this metric IS NOT:</strong> Evidence of guilt, liability, or legal responsibility. 
            It does not establish facts or draw legal conclusions.
          </p>
          <p>
            <strong>Proper use:</strong> Use metrics as investigative leads or analytical insights, 
            not as standalone evidence or determinations.
          </p>
        </div>
      </div>
    </DialogContent>
  );
}

/**
 * Predefined metric metadata for common heuristics.
 * @deprecated Use METRIC_REGISTRY from @/lib/metricRegistry instead
 */
export { METRIC_LIBRARY, METRIC_REGISTRY } from "@/lib/metricRegistry";
