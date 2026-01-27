#!/usr/bin/env node
const fs = require("fs");
const crypto = require("crypto");
const AdmZip = require("adm-zip");

function computeManifestHash(manifest) {
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

function computeSha256Hex(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function isFilesSorted(files) {
  for (let i = 1; i < files.length; i++) {
    if (files[i].path.localeCompare(files[i - 1].path) < 0) {
      return false;
    }
  }
  return true;
}

function createAdmZipReader(zipPath) {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  return {
    async getEntries() {
      return entries.map((entry) => ({
        path: entry.entryName,
        async getData() {
          return entry.getData();
        },
      }));
    },
  };
}

async function verifyBundle(zipReader, strict = true) {
  const result = {
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
  };

  const entries = await zipReader.getEntries();
  
  const manifestEntry = entries.find((e) => e.path.endsWith("/MANIFEST.json"));
  if (!manifestEntry) {
    result.notes.push("MANIFEST.json not found in bundle");
    return result;
  }

  const bundleRoot = manifestEntry.path.replace("MANIFEST.json", "");

  let manifest;
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

  const entryMap = new Map();
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

  result.bundle_ok =
    result.manifest_ok &&
    result.manifest_hash_match &&
    result.files_ok &&
    result.raw_sources_ok &&
    result.extra_files.length === 0;

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error("Usage: node verify_bundle.js /path/to/bundle.zip [--strict=true|false]");
    process.exit(1);
  }

  const zipPath = args[0];
  let strict = true;

  for (const arg of args.slice(1)) {
    if (arg.startsWith("--strict=")) {
      strict = arg.split("=")[1] !== "false";
    }
  }

  if (!fs.existsSync(zipPath)) {
    console.error(JSON.stringify({ error: `File not found: ${zipPath}` }));
    process.exit(1);
  }

  try {
    const reader = createAdmZipReader(zipPath);
    const result = await verifyBundle(reader, strict);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.bundle_ok ? 0 : 1);
  } catch (e) {
    console.error(JSON.stringify({ error: String(e) }));
    process.exit(1);
  }
}

main();
