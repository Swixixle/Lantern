import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, Upload, AlertCircle, FileText, CheckCircle, Anchor, Loader2, Download } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { CORPUS_PURPOSES, SYSTEM_LIMITATIONS, type CorpusPurpose, type CorpusSource } from "@/lib/schema/corpus";

interface BuildResult {
  corpus_id: string;
  mode: string;
  status: string;
  anchors_created: number;
  claims_created: number;
  constraints_created: number;
}

export default function Intake() {
  const [, navigate] = useLocation();
  
  const [purpose, setPurpose] = useState<CorpusPurpose | "">("");
  const [corpusId, setCorpusId] = useState<string | null>(null);
  const [creatingCorpus, setCreatingCorpus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [primarySources, setPrimarySources] = useState<CorpusSource[]>([]);
  const [secondarySources, setSecondarySources] = useState<CorpusSource[]>([]);
  const [uploadingPrimary, setUploadingPrimary] = useState(false);
  const [uploadingSecondary, setUploadingSecondary] = useState(false);
  
  const [building, setBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const [includeRawSources, setIncludeRawSources] = useState(false);
  
  const primaryInputRef = useRef<HTMLInputElement>(null);
  const secondaryInputRef = useRef<HTMLInputElement>(null);

  const handleCreateCorpus = async () => {
    if (!purpose) return;
    
    setCreatingCorpus(true);
    setError(null);
    
    try {
      const response = await fetch("/api/corpus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create corpus");
      }
      
      const result = await response.json();
      setCorpusId(result.corpus_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreatingCorpus(false);
    }
  };

  const handleUpload = async (file: File, role: "PRIMARY" | "SECONDARY") => {
    if (!corpusId) return;
    
    const setUploading = role === "PRIMARY" ? setUploadingPrimary : setUploadingSecondary;
    const setSources = role === "PRIMARY" ? setPrimarySources : setSecondarySources;
    
    setUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("role", role);
      
      const response = await fetch(`/api/corpus/${corpusId}/sources`, {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload source");
      }
      
      const result = await response.json();
      setSources(prev => [...prev, {
        source_id: result.source_id,
        corpus_id: result.corpus_id,
        role: result.role,
        filename: result.filename,
        uploaded_at: result.uploaded_at,
        sha256_hex: result.sha256_hex
      }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUploading(false);
    }
  };

  const handlePrimaryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file, "PRIMARY");
    e.target.value = "";
  };

  const handleSecondaryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file, "SECONDARY");
    e.target.value = "";
  };

  const handleBuildAnchors = async () => {
    if (!corpusId) return;
    
    setBuilding(true);
    setError(null);
    setBuildResult(null);
    
    try {
      const response = await fetch(`/api/corpus/${corpusId}/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "anchors_only" })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to build anchors");
      }
      
      const result: BuildResult = await response.json();
      setBuildResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBuilding(false);
    }
  };

  const hasAnySources = primarySources.length > 0 || secondarySources.length > 0;

  const handleExportBundle = async () => {
    if (!corpusId) return;
    
    setExporting(true);
    setError(null);
    
    try {
      const url = `/api/corpus/${corpusId}/export_bundle${includeRawSources ? "?include_raw_sources=true" : ""}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to export bundle");
      }
      
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `lantern-corpus-${corpusId}.zip`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">LANTERN</h1>
          </div>
          <p className="text-muted-foreground">Corpus Intake</p>
        </header>

        {error && (
          <Card className="mb-6 border-red-500/30">
            <CardContent className="py-3 text-sm text-red-400">
              {error}
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">System Limitations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {SYSTEM_LIMITATIONS.map((limitation, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  {limitation}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {!corpusId ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Create Corpus</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground block mb-2">Purpose</label>
                <Select value={purpose} onValueChange={(v) => setPurpose(v as CorpusPurpose)}>
                  <SelectTrigger data-testid="select-purpose">
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {CORPUS_PURPOSES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                onClick={handleCreateCorpus}
                disabled={!purpose || creatingCorpus}
                className="bg-cyan-600 hover:bg-cyan-500"
                data-testid="button-create-corpus"
              >
                Create Corpus
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-6 border-cyan-500/30 bg-cyan-500/5">
              <CardContent className="py-4">
                <p className="text-sm font-semibold text-cyan-400 mb-2">Corpus Created</p>
                <p className="text-xs font-mono text-muted-foreground" data-testid="corpus-id">
                  corpus_id: {corpusId}
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Primary Sources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <input
                    ref={primaryInputRef}
                    type="file"
                    className="hidden"
                    onChange={handlePrimaryFileChange}
                    data-testid="input-primary-file"
                  />
                  <Button
                    onClick={() => primaryInputRef.current?.click()}
                    disabled={uploadingPrimary}
                    variant="outline"
                    className="w-full"
                    data-testid="button-upload-primary"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingPrimary ? "Uploading..." : "Upload Primary"}
                  </Button>
                  
                  {primarySources.length > 0 && (
                    <div className="space-y-2">
                      {primarySources.map((source) => (
                        <div key={source.source_id} className="p-2 bg-muted/30 rounded text-xs" data-testid={`source-${source.source_id}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-3 h-3" />
                            <span className="truncate">{source.filename}</span>
                          </div>
                          <div className="text-muted-foreground font-mono text-[10px] break-all">
                            sha256: {source.sha256_hex}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Secondary Sources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <input
                    ref={secondaryInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleSecondaryFileChange}
                    data-testid="input-secondary-file"
                  />
                  <Button
                    onClick={() => secondaryInputRef.current?.click()}
                    disabled={uploadingSecondary}
                    variant="outline"
                    className="w-full"
                    data-testid="button-upload-secondary"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingSecondary ? "Uploading..." : "Upload Secondary"}
                  </Button>
                  
                  {secondarySources.length > 0 && (
                    <div className="space-y-2">
                      {secondarySources.map((source) => (
                        <div key={source.source_id} className="p-2 bg-muted/30 rounded text-xs" data-testid={`source-${source.source_id}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-3 h-3" />
                            <span className="truncate">{source.filename}</span>
                          </div>
                          <div className="text-muted-foreground font-mono text-[10px] break-all">
                            sha256: {source.sha256_hex}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {hasAnySources && (
              <div className="space-y-4">
                <Button
                  onClick={handleBuildAnchors}
                  disabled={building}
                  variant="outline"
                  className="w-full"
                  data-testid="button-build-anchors"
                >
                  {building ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Anchor className="w-4 h-4 mr-2" />
                  )}
                  Build Anchors (Explicit)
                </Button>
                
                {buildResult && (
                  <Card className="border-cyan-500/30 bg-cyan-500/5">
                    <CardContent className="py-4">
                      <p className="text-sm font-semibold text-cyan-400 mb-2">Build Complete</p>
                      <div className="text-xs font-mono text-muted-foreground space-y-1">
                        <p>mode: {buildResult.mode}</p>
                        <p>status: {buildResult.status}</p>
                        <p>anchors_created: {buildResult.anchors_created}</p>
                        <p>claims_created: {buildResult.claims_created}</p>
                        <p>constraints_created: {buildResult.constraints_created}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <Button
                  onClick={() => navigate(`/?corpusId=${corpusId}`)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500"
                  data-testid="button-enter-claim-space"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Enter Claim Space
                </Button>
                
                <div className="border-t border-border pt-4 mt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="include-raw-sources"
                      checked={includeRawSources}
                      onCheckedChange={(checked) => setIncludeRawSources(checked === true)}
                      data-testid="checkbox-include-raw-sources"
                    />
                    <label htmlFor="include-raw-sources" className="text-sm text-muted-foreground">
                      Include raw sources (PDFs)
                    </label>
                  </div>
                  <Button
                    onClick={handleExportBundle}
                    disabled={exporting}
                    variant="outline"
                    className="w-full"
                    data-testid="button-export-bundle"
                  >
                    {exporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Export Corpus Bundle (ZIP)
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        <footer className="mt-12 pt-6 border-t border-border/50 text-center text-xs text-muted-foreground">
          <p>No claims are generated automatically on upload.</p>
        </footer>
      </div>
    </div>
  );
}
