import * as crypto from "crypto";

export interface BundleManifest {
  bundle_format: string;
  corpus_id: string;
  generated_at: string;
  include_raw_sources: boolean;
  files: Array<{ path: string; sha256_hex: string }>;
  manifest_hash_alg: string;
  manifest_hash_hex: string;
}

export interface FileMismatch {
  path: string;
  expected_sha256: string;
  actual_sha256: string;
}

export interface AnchorsIndexMismatch {
  anchor_id: string | null;
  issue: "PAGE_JSON_MISSING" | "PAGE_TEXT_HASH_MISMATCH" | "ANCHORS_NOT_SORTED";
  expected: string | null;
  actual: string | null;
  path: string | null;
}

export interface BundleVerifyResult {
  bundle_ok: boolean;
  manifest_ok: boolean;
  manifest_hash_match: boolean;
  files_ok: boolean;
  include_raw_sources: boolean;
  raw_sources_ok: boolean;
  files_checked: number;
  mismatches: FileMismatch[];
  extra_files: string[];
  missing_files: string[];
  notes: string[];
  anchors_index_ok: boolean | null;
  anchors_index_checked: number;
  anchors_index_mismatches: AnchorsIndexMismatch[];
}

export function computeManifestHash(manifest: BundleManifest): string {
  const canonical = {
    bundle_format: manifest.bundle_format,
    corpus_id: manifest.corpus_id,
    include_raw_sources: manifest.include_raw_sources,
    files: manifest.files,
    manifest_hash_alg: manifest.manifest_hash_alg,
  };
  const jsonStr = JSON.stringify(canonical);
  return crypto.createHash("sha256").update(jsonStr, "utf8").digest("hex");
}

export function computeSha256Hex(data: Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function isFilesSorted(files: Array<{ path: string }>): boolean {
  for (let i = 1; i < files.length; i++) {
    if (files[i].path.localeCompare(files[i - 1].path) < 0) {
      return false;
    }
  }
  return true;
}

export interface ZipEntry {
  path: string;
  getData(): Promise<Buffer>;
}

export interface ZipReader {
  getEntries(): Promise<ZipEntry[]>;
}

export async function verifyBundle(
  zipReader: ZipReader,
  strict: boolean = true
): Promise<BundleVerifyResult> {
  const result: BundleVerifyResult = {
    bundle_ok: false,
    manifest_ok: false,
    manifest_hash_match: false,
    files_ok: false,
    include_raw_sources: false,
    raw_sources_ok: false,
    files_checked: 0,
    mismatches: [],
    extra_files: [],
    missing_files: [],
    notes: [],
    anchors_index_ok: null,
    anchors_index_checked: 0,
    anchors_index_mismatches: [],
  };

  const entries = await zipReader.getEntries();
  
  const manifestEntry = entries.find((e) => e.path.endsWith("/MANIFEST.json"));
  if (!manifestEntry) {
    result.notes.push("MANIFEST.json not found in bundle");
    return result;
  }

  const bundleRoot = manifestEntry.path.replace("MANIFEST.json", "");

  let manifest: BundleManifest;
  try {
    const manifestData = await manifestEntry.getData();
    manifest = JSON.parse(manifestData.toString("utf8"));
    result.manifest_ok = true;
  } catch (e) {
    result.notes.push(`Failed to parse MANIFEST.json: ${e}`);
    return result;
  }

  result.include_raw_sources = manifest.include_raw_sources;

  const recomputedHash = computeManifestHash(manifest);
  result.manifest_hash_match = recomputedHash === manifest.manifest_hash_hex;
  if (!result.manifest_hash_match) {
    result.notes.push(
      `Manifest hash mismatch: expected ${manifest.manifest_hash_hex}, computed ${recomputedHash}`
    );
  }

  if (!isFilesSorted(manifest.files)) {
    result.notes.push("Manifest files[] is not lexicographically sorted by path");
  }

  const entryMap = new Map<string, ZipEntry>();
  for (const entry of entries) {
    if (entry.path.startsWith(bundleRoot) && entry.path !== bundleRoot) {
      const relativePath = entry.path.slice(bundleRoot.length);
      if (relativePath && !relativePath.endsWith("/")) {
        entryMap.set(relativePath, entry);
      }
    }
  }

  const manifestPaths = new Set(manifest.files.map((f) => f.path));
  manifestPaths.add("MANIFEST.json");

  for (const file of manifest.files) {
    const entry = entryMap.get(file.path);
    if (!entry) {
      result.missing_files.push(file.path);
    } else {
      const data = await entry.getData();
      const actualHash = computeSha256Hex(data);
      if (actualHash !== file.sha256_hex) {
        result.mismatches.push({
          path: file.path,
          expected_sha256: file.sha256_hex,
          actual_sha256: actualHash,
        });
      }
      result.files_checked++;
    }
  }

  result.files_ok =
    result.mismatches.length === 0 && result.missing_files.length === 0;

  const hasRawSourcesDir = Array.from(entryMap.keys()).some((p) =>
    p.startsWith("raw_sources/")
  );

  if (manifest.include_raw_sources) {
    result.raw_sources_ok = hasRawSourcesDir;
    if (!hasRawSourcesDir) {
      result.notes.push(
        "include_raw_sources=true but raw_sources/ directory not found"
      );
    }
  } else {
    result.raw_sources_ok = !hasRawSourcesDir;
    if (hasRawSourcesDir) {
      result.notes.push(
        "include_raw_sources=false but raw_sources/ directory exists"
      );
    }
  }

  if (strict) {
    for (const [relativePath] of entryMap) {
      if (relativePath === "MANIFEST.json") continue;
      if (manifestPaths.has(relativePath)) continue;
      if (
        manifest.include_raw_sources &&
        relativePath.startsWith("raw_sources/")
      ) {
        continue;
      }
      result.extra_files.push(relativePath);
    }
  }

  const anchorsIndexEntry = entryMap.get("anchors_proof_index.json");
  if (!anchorsIndexEntry) {
    result.anchors_index_ok = null;
    result.anchors_index_checked = 0;
    result.anchors_index_mismatches = [];
    result.notes.push("anchors_proof_index.json not present; skipping");
  } else {
    try {
      const anchorsIndexData = await anchorsIndexEntry.getData();
      const anchorsIndex = JSON.parse(anchorsIndexData.toString("utf8"));
      
      if (!anchorsIndex.corpus_id || !anchorsIndex.extractor || !anchorsIndex.anchors) {
        result.anchors_index_ok = false;
        result.notes.push("anchors_proof_index.json missing required top-level keys");
      } else if (anchorsIndex.extractor.name !== "pdfjs-text-v1" || anchorsIndex.extractor.version !== "1.0.0") {
        result.anchors_index_ok = false;
        result.notes.push(`anchors_proof_index.json extractor mismatch: expected pdfjs-text-v1@1.0.0, got ${anchorsIndex.extractor.name}@${anchorsIndex.extractor.version}`);
      } else if (!Array.isArray(anchorsIndex.anchors)) {
        result.anchors_index_ok = false;
        result.notes.push("anchors_proof_index.json anchors is not an array");
      } else {
        let sortedOk = true;
        for (let i = 1; i < anchorsIndex.anchors.length; i++) {
          if (anchorsIndex.anchors[i].anchor_id.localeCompare(anchorsIndex.anchors[i - 1].anchor_id) < 0) {
            sortedOk = false;
            result.anchors_index_mismatches.push({
              anchor_id: null,
              issue: "ANCHORS_NOT_SORTED",
              expected: null,
              actual: null,
              path: null
            });
            break;
          }
        }
        
        for (const anchor of anchorsIndex.anchors) {
          if (
            anchor.anchor_id === undefined ||
            anchor.source_id === undefined ||
            anchor.page_index === undefined ||
            anchor.quote_start_char === undefined ||
            anchor.quote_end_char === undefined ||
            anchor.page_text_sha256_hex === undefined
          ) {
            continue;
          }
          
          if (typeof anchor.page_index !== "number" || anchor.page_index < 0) {
            continue;
          }
          
          const pagePath = `pages/${anchor.source_id}/page-${anchor.page_index}.json`;
          const pageEntry = entryMap.get(pagePath);
          
          if (!pageEntry) {
            result.anchors_index_mismatches.push({
              anchor_id: anchor.anchor_id,
              issue: "PAGE_JSON_MISSING",
              expected: anchor.page_text_sha256_hex,
              actual: null,
              path: pagePath
            });
          } else {
            const pageData = await pageEntry.getData();
            const pageJson = JSON.parse(pageData.toString("utf8"));
            if (pageJson.page_text_sha256_hex !== anchor.page_text_sha256_hex) {
              result.anchors_index_mismatches.push({
                anchor_id: anchor.anchor_id,
                issue: "PAGE_TEXT_HASH_MISMATCH",
                expected: anchor.page_text_sha256_hex,
                actual: pageJson.page_text_sha256_hex,
                path: pagePath
              });
            }
          }
          
          result.anchors_index_checked++;
        }
        
        result.anchors_index_ok = sortedOk && result.anchors_index_mismatches.length === 0;
      }
    } catch (e) {
      result.anchors_index_ok = false;
      result.notes.push(`Failed to parse anchors_proof_index.json: ${e}`);
    }
  }

  result.bundle_ok =
    result.manifest_ok &&
    result.manifest_hash_match &&
    result.files_ok &&
    result.raw_sources_ok &&
    result.extra_files.length === 0 &&
    (result.anchors_index_ok === null || result.anchors_index_ok === true);

  return result;
}
