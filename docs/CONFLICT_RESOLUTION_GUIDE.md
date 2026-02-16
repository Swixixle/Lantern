# Conflict Resolution Guide for Lantern

## Overview

Lantern identifies three types of constraints that require analyst attention:

1. **CONFLICTS** — Contradictory evidence between sources
2. **MISSING_EVIDENCE** — Gaps in the evidentiary record
3. **TIME_MISMATCHES** — Temporal inconsistencies in claims

This guide focuses on how to address and resolve **conflicts** when they are detected by the system.

---

## What Are Conflicts in Lantern?

A **conflict** occurs when two or more pieces of evidence in your corpus contain contradictory information. Lantern does not automatically resolve these conflicts — it flags them for analyst review.

### Conflict Structure

Each conflict includes:
- **Constraint ID**: Unique identifier for the conflict
- **Summary**: Description of the contradiction
- **Left Anchor**: First piece of evidence with source reference
- **Right Anchor**: Second piece of evidence with source reference
- **Claim ID** (optional): Associated claim if applicable

### Example Conflict

```
Type: CONFLICT
Summary: Payment terms stated as net-30 in Section 4.2 but net-45 in Amendment A.
Left Anchor: Master Services Agreement v2.1.pdf, p. 5
Right Anchor: Amendment A.pdf, p. 1
```

---

## How to Access Conflicts

### 1. Via Constraints Page
Navigate to **Constraints** in the application to see all conflicts, missing evidence, and time mismatches in one view.

### 2. Via Verified Record
The Verified Record (canonical output artifact) includes a complete list of all detected conflicts.

Access via:
- **API**: `GET /api/corpus/:corpusId/verified-record`
- **Export**: Download as PDF from the Verified Record page

### 3. Via Snapshot Detail
The Snapshot Detail page shows constraints in context with the specific corpus state.

---

## Resolution Workflow

### Step 1: Review the Conflict

1. Navigate to the **Constraints** page
2. Locate the conflict (marked with red border)
3. Click **"View Evidence"** to examine both anchors
4. Read the conflicting passages in their full context

### Step 2: Investigate Source Precedence

Determine which source takes precedence by considering:

**Temporal Precedence**
- Which document is more recent?
- Does one document explicitly amend or supersede the other?

**Authority Precedence**
- Which source is authoritative for this claim?
- Are these primary or secondary sources?

**Scope Precedence**
- Does one source have broader or narrower scope?
- Are both sources applicable to the same context?

### Step 3: Document Your Resolution

You have several options for resolving a conflict:

#### Option A: Update Claim Classification

If the conflict affects a claim:
1. Navigate to the associated claim in the Dossier Editor
2. Reclassify the claim based on your analysis:
   - **DEFENSIBLE** — If one source clearly supersedes the other
   - **AMBIGUOUS** — If precedence cannot be determined
   - **RESTRICTED** — If the conflict makes the claim indefensible

#### Option B: Add Explanatory Evidence

1. Create a new anchor documenting your resolution reasoning
2. Link the anchor to relevant claims
3. Include:
   - Which source you determined to be authoritative
   - Why you made that determination
   - Any relevant policy or precedent

#### Option C: Flag for External Review

If you cannot resolve the conflict:
1. Document the unresolved conflict in your report
2. Include both conflicting statements
3. Note that resolution requires external input
4. Specify what additional information is needed

### Step 4: Update the Verified Record

After addressing the conflict:
1. Regenerate the Verified Record
2. Verify the conflict is properly documented or resolved
3. Note the resolution in your audit trail

---

## Conflict Resolution Examples

### Example 1: Superseding Document

**Conflict**: Contract term differs between original agreement and amendment

**Resolution**:
- Determined that Amendment A (dated later) explicitly supersedes Section 4.2
- Updated claim to reflect Amendment A terms
- Classified claim as DEFENSIBLE with anchor to Amendment A
- Documented supersession in evidence notes

### Example 2: Ambiguous Precedence

**Conflict**: Two regulatory sources cite different compliance deadlines

**Resolution**:
- Could not determine which regulation applies to this jurisdiction
- Reclassified claim as AMBIGUOUS
- Documented both deadlines with clear anchor references
- Flagged for legal review before publication

### Example 3: Contradictory Witness Statements

**Conflict**: Two deposition transcripts contain conflicting timeline statements

**Resolution**:
- Determined neither statement can be preferred without additional evidence
- Created RESTRICTED claim noting the contradiction
- Documented refusal reason: "Contradictory witness statements without corroboration"
- Included both anchors in the restricted claim record

---

## Best Practices

### DO:

✓ **Review conflicts systematically** — Address all conflicts before finalizing reports

✓ **Document your reasoning** — Future auditors need to understand your decisions

✓ **Preserve both anchors** — Never delete conflicting evidence, even after resolution

✓ **Use claim classification** — Leverage DEFENSIBLE/AMBIGUOUS/RESTRICTED to communicate confidence

✓ **Seek external review** — Flag conflicts you cannot resolve with available evidence

✓ **Regenerate Verified Records** — Always regenerate after making resolution changes

### DON'T:

✗ **Don't ignore conflicts** — Unaddressed conflicts undermine report credibility

✗ **Don't delete evidence** — Removal of conflicting anchors violates audit trail integrity

✗ **Don't guess** — If precedence is unclear, classify as AMBIGUOUS rather than making assumptions

✗ **Don't merge sources** — Keep conflicting evidence separate and traceable

✗ **Don't over-claim** — A resolved conflict doesn't make a claim "proven," just defensible

---

## Understanding Lantern's Conflict Philosophy

### Lantern Does Not:
- Automatically resolve conflicts
- Choose "winning" evidence
- Infer intent or precedence
- Hide contradictions

### Lantern Does:
- **Detect** conflicts systematically
- **Surface** contradictions explicitly
- **Preserve** all conflicting evidence
- **Enable** analyst-driven resolution with full traceability

This approach ensures that:
1. No evidence is hidden or suppressed
2. Resolution reasoning is documented
3. Audit trails remain intact
4. Reports can withstand cross-examination

---

## Technical Notes

### Conflict Detection

Conflicts are stored in the database with:
- Type: `"CONFLICT"`
- Left/Right anchor references
- Summary text
- Optional claim linkage

### Verified Record Schema

Conflicts appear in the Verified Record as:
```typescript
{
  constraint_id: string,
  type: "CONFLICT",
  summary: string,
  claim_id: string | null,
  left_anchor: {
    anchor_id: string,
    source_document: string,
    page_ref: string
  },
  right_anchor: {
    anchor_id: string,
    source_document: string,
    page_ref: string
  }
}
```

### API Endpoints

- `GET /api/corpus/:corpusId/constraints` — Retrieve all constraints
- `GET /api/corpus/:corpusId/verified-record` — Full verified record with conflicts
- `GET /api/corpus/:corpusId/verified-record.pdf` — Printable export

---

## Frequently Asked Questions

**Q: What if I find a conflict that shouldn't be flagged?**

A: Document why it's not a true conflict in your evidence notes. The conflict detection is rule-based and conservative by design.

**Q: Can I delete a conflict from the system?**

A: No. Conflicts are detected from the evidence corpus. To "resolve" a conflict, address it through claim classification and documentation, not deletion.

**Q: How do conflicts affect the Verified Record?**

A: All conflicts are included in the Verified Record. This is intentional — the record must reflect the complete evidentiary state, including unresolved conflicts.

**Q: What if a conflict cannot be resolved?**

A: Document it as such. Reports can include unresolved conflicts with clear notation that additional information is required. This is more defensible than making an unsupported choice.

**Q: Should I always resolve conflicts before generating a report?**

A: You should *address* all conflicts (by resolution, documentation, or flagging), but not all conflicts need to be "resolved" in the sense of choosing one side. Sometimes the most defensible position is acknowledging the conflict.

---

## Related Documentation

- [Constraints Page Documentation](../client/src/pages/constraints.tsx) — UI for viewing conflicts
- [Verified Record Schema](../shared/verifiedRecord.ts) — Technical schema details
- [Evidence Walkthrough](../demos/evidence-walkthrough/README.md) — Interpretive discipline
- [Lantern Core Boundary](../LANTERN_CORE_BOUNDARY.md) — System design principles

---

## Support

For questions about conflict resolution:
- Review the Evidence Walkthrough demo: `/demos/evidence-walkthrough`
- Check the Constraints view in the application
- Consult with your legal or compliance team for precedence determination

Remember: **Lantern structures evidence. Resolution requires judgment.**
