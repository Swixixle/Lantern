/**
 * Evidence Density Warning Component
 * 
 * Displays warnings when evidence density is below threshold
 * and prompts for user assertion when automatic mapping is refused.
 */

import { useState } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { checkEvidenceDensity, requiresUserAssertion } from "@/lib/refusalThreshold";

interface EvidenceDensityWarningProps {
  /** Number of supporting evidence pieces */
  evidenceCount: number;
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Callback when user asserts the claim */
  onUserAssert: (justification: string) => void;
  
  /** Callback when user cancels */
  onCancel: () => void;
  
  /** Whether to show as dialog or inline */
  variant?: "dialog" | "inline";
  
  /** Whether dialog is open (for dialog variant) */
  open?: boolean;
}

/**
 * Warns users about low evidence density and prompts for justification.
 */
export function EvidenceDensityWarning({
  evidenceCount,
  confidence,
  onUserAssert,
  onCancel,
  variant = "dialog",
  open = true,
}: EvidenceDensityWarningProps) {
  const [justification, setJustification] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const densityCheck = checkEvidenceDensity(evidenceCount);
  const assertionCheck = requiresUserAssertion(confidence, evidenceCount);
  
  const handleAssert = async () => {
    setIsSubmitting(true);
    try {
      await onUserAssert(justification);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const content = (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Insufficient Evidence Density</AlertTitle>
        <AlertDescription>
          {assertionCheck.reason}
        </AlertDescription>
      </Alert>
      
      <div className="space-y-2">
        <div className="text-sm">
          <strong>Evidence Count:</strong> {evidenceCount} / {densityCheck.minimum_required} required
        </div>
        <div className="text-sm">
          <strong>Confidence:</strong> {(confidence * 100).toFixed(1)}%
        </div>
      </div>
      
      <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
        <strong className="text-amber-900">Human Assertion Required</strong>
        <p className="text-amber-800 mt-1">
          The system cannot automatically map this claim due to low evidence density.
          If you believe this claim is valid despite the low confidence, you may
          manually assert it. Your assertion will be logged with your user ID and timestamp.
        </p>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-semibold">
          Justification (required)
        </label>
        <Textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder="Explain why you are overriding the automatic refusal..."
          rows={4}
          className="text-sm"
        />
        <p className="text-xs text-slate-500">
          This justification will be permanently recorded in the audit trail.
        </p>
      </div>
    </div>
  );
  
  if (variant === "inline") {
    return (
      <div className="space-y-4">
        {content}
        <div className="flex gap-2">
          <Button
            onClick={handleAssert}
            disabled={!justification.trim() || isSubmitting}
            variant="default"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Assert Claim
          </Button>
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manual Claim Assertion Required</DialogTitle>
          <DialogDescription>
            This claim requires explicit human validation due to insufficient evidence density.
          </DialogDescription>
        </DialogHeader>
        
        {content}
        
        <DialogFooter>
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={handleAssert}
            disabled={!justification.trim() || isSubmitting}
            variant="default"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {isSubmitting ? "Asserting..." : "Assert Claim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline alert for evidence density status (pass/warning).
 */
export function EvidenceDensityStatus({
  evidenceCount,
  confidence,
  className = "",
}: {
  evidenceCount: number;
  confidence: number;
  className?: string;
}) {
  const densityCheck = checkEvidenceDensity(evidenceCount);
  const assertionCheck = requiresUserAssertion(confidence, evidenceCount);
  
  if (assertionCheck.required) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Manual Assertion Required</AlertTitle>
        <AlertDescription className="text-xs">
          {assertionCheck.reason}
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <Alert variant="default" className={`bg-green-50 border-green-200 ${className}`}>
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-xs text-green-800">
        Evidence density sufficient ({evidenceCount} supporting pieces)
      </AlertDescription>
    </Alert>
  );
}
