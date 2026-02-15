export interface VerifyFileResult {
  filename: string;
  expected_sha256: string;
  actual_sha256: string;
  size_expected: number;
  size_actual: number;
  match: boolean;
}

export interface VerifyPackResult {
  status: "VERIFIED" | "FAILED" | "VERIFIED_WITH_WARNINGS";
  schema: string;
  pack_id: string;
  export_lens: string;
  tool_version: string;
  created_at: string;
  report_hash: string;
  files: VerifyFileResult[];
  warnings: string[];
  errors: string[];
}

async function sha256Bytes(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyEvidencePack(zipBlob: Blob): Promise<VerifyPackResult> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(zipBlob);

  const warnings: string[] = [];
  const errors: string[] = [];

  const manifestFile = zip.file("MANIFEST.json");
  if (!manifestFile) {
    return {
      status: "FAILED",
      schema: "",
      pack_id: "",
      export_lens: "",
      tool_version: "",
      created_at: "",
      report_hash: "",
      files: [],
      warnings: [],
      errors: ["MANIFEST.json not found in ZIP"],
    };
  }

  let manifest: any;
  try {
    const manifestText = await manifestFile.async("string");
    manifest = JSON.parse(manifestText);
  } catch {
    return {
      status: "FAILED",
      schema: "",
      pack_id: "",
      export_lens: "",
      tool_version: "",
      created_at: "",
      report_hash: "",
      files: [],
      warnings: [],
      errors: ["MANIFEST.json is not valid JSON"],
    };
  }

  if (manifest.schema !== "lantern.evidence_pack.v0") {
    warnings.push(`Unexpected schema: "${manifest.schema}" (expected "lantern.evidence_pack.v0")`);
  }

  const fileResults: VerifyFileResult[] = [];
  const manifestFiles = manifest.files || {};

  for (const [filename, meta] of Object.entries(manifestFiles) as [string, any][]) {
    const zipEntry = zip.file(filename);
    if (!zipEntry) {
      errors.push(`Listed file missing from ZIP: ${filename}`);
      fileResults.push({
        filename,
        expected_sha256: meta.sha256,
        actual_sha256: "",
        size_expected: meta.size,
        size_actual: 0,
        match: false,
      });
      continue;
    }

    const bytes = await zipEntry.async("uint8array");
    const actualHash = await sha256Bytes(bytes);

    fileResults.push({
      filename,
      expected_sha256: meta.sha256,
      actual_sha256: actualHash,
      size_expected: meta.size,
      size_actual: bytes.byteLength,
      match: actualHash === meta.sha256,
    });

    if (actualHash !== meta.sha256) {
      errors.push(`Hash mismatch: ${filename}`);
    }
  }

  const allZipFiles = Object.keys(zip.files).filter(f => !f.endsWith("/"));
  const manifestFileNames = new Set(Object.keys(manifestFiles));
  manifestFileNames.add("MANIFEST.json");
  for (const f of allZipFiles) {
    if (!manifestFileNames.has(f)) {
      warnings.push(`Extra file not listed in manifest: ${f}`);
    }
  }

  let status: VerifyPackResult["status"];
  if (errors.length > 0) {
    status = "FAILED";
  } else if (warnings.length > 0) {
    status = "VERIFIED_WITH_WARNINGS";
  } else {
    status = "VERIFIED";
  }

  return {
    status,
    schema: manifest.schema || "",
    pack_id: manifest.pack_id || "",
    export_lens: manifest.export_lens || "",
    tool_version: manifest.tool_version || "",
    created_at: manifest.created_at || "",
    report_hash: manifest.report_hash || "",
    files: fileResults,
    warnings,
    errors,
  };
}
