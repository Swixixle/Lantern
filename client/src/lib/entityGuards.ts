const PERSON_STOPWORDS = new Set([
  "evidence", "exhibit", "exhibits", "section", "schedule", "appendix",
  "plaintiff", "defendant", "court", "judge", "order", "motion",
  "memorandum", "agreement", "contract", "statement", "declaration",
  "affidavit", "article", "rule", "figure", "table", "email", "phone",
  "address", "testimony", "verdict", "ruling", "statute", "regulation",
  "complaint", "petition", "subpoena", "injunction", "indictment",
  "arraignment", "deposition", "interrogatory", "stipulation",
  "amendment", "provision", "clause", "paragraph", "subsection",
  "allegation", "assertion", "contention", "submission", "response",
  "reply", "brief", "filing", "proceeding", "hearing", "trial",
  "settlement", "judgment", "decree", "warrant", "summons",
  "notice", "disclosure", "discovery", "arbitration", "mediation",
  "damages", "liability", "negligence", "breach", "fraud",
  "conspiracy", "obstruction", "perjury", "contempt",
  "transcript", "record", "document", "report", "analysis",
  "review", "assessment", "evaluation", "investigation",
  "finding", "conclusion", "recommendation", "opinion",
  "dissent", "concurrence", "majority", "minority",
  "counsel", "attorney", "advocate", "solicitor", "barrister",
  "prosecution", "defense", "tribunal", "commission", "committee",
  "board", "panel", "authority", "agency", "department",
  "ministry", "bureau", "office", "division", "branch",
  "chapter", "title", "volume", "issue", "page",
  "footnote", "endnote", "citation", "reference", "source",
  "abstract", "summary", "overview", "introduction", "background",
  "methodology", "results", "discussion", "appendices",
  "schedule", "annex", "addendum", "supplement", "errata",
  "protocol", "guideline", "standard", "policy", "procedure",
  "resolution", "directive", "instruction", "circular", "bulletin",
]);

export function shouldBlockPersonCandidate(text: string): boolean {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2) return true;
  if (/^[\d\p{P}\s]+$/u.test(trimmed)) return true;
  if (/^[A-Z]+$/.test(trimmed) && trimmed.length <= 6) return true;
  const lower = trimmed.toLowerCase();
  if (PERSON_STOPWORDS.has(lower)) return true;
  const words = trimmed.split(/\s+/);
  if (words.length === 1 && PERSON_STOPWORDS.has(words[0].toLowerCase())) return true;
  if (words.length <= 2) {
    for (const w of words) {
      if (PERSON_STOPWORDS.has(w.toLowerCase())) return true;
    }
  }
  return false;
}

export function getPersonStopwords(): Set<string> {
  return PERSON_STOPWORDS;
}
