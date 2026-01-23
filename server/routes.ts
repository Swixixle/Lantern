import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCaseSchema, insertUploadSchema, ingestionStateEnum } from "@shared/schema";
import { z } from "zod";
import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join, extname } from "path";
import multer from "multer";
import PDFParser from "pdf2json";

const isDev = process.env.NODE_ENV !== "production";

const UPLOADS_DIR = join(process.cwd(), "uploads");

async function ensureUploadsDir() {
  try {
    await mkdir(UPLOADS_DIR, { recursive: true });
  } catch (e) {
  }
}

const ALLOWED_TEXT_EXTENSIONS = [".txt", ".md"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_PDF_SIZE = 10 * 1024 * 1024;
const MIN_TEXT_LENGTH = 50;

const textUploadStorage = multer.memoryStorage();

const textUpload = multer({
  storage: textUploadStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    if (ext === ".pdf") {
      cb(new Error("USE_PDF_ENDPOINT"));
      return;
    }
    if (!ALLOWED_TEXT_EXTENSIONS.includes(ext)) {
      cb(new Error("UNSUPPORTED_TYPE"));
      return;
    }
    cb(null, true);
  }
});

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    if (ext !== ".pdf") {
      cb(new Error("NOT_A_PDF"));
      return;
    }
    cb(null, true);
  }
});

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function computeSha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await ensureUploadsDir();
  
  app.get("/__boot", (_req, res) => {
    if (!isDev) {
      return res.status(404).send("Not Found");
    }
    const timestamp = new Date().toISOString();
    const html = `<!DOCTYPE html>
<html>
<head><title>Boot Test</title></head>
<body style="background:#111;color:#0f0;font-family:monospace;padding:40px;">
  <h1 style="font-size:48px;margin-bottom:20px;">BOOT OK</h1>
  <p>Timestamp: ${timestamp}</p>
  <p>PID: ${process.pid}</p>
  <p>Server is responding correctly.</p>
  <hr style="border-color:#333;margin:20px 0;">
  <p><a href="/" style="color:#0ff;font-size:18px;">Open App →</a></p>
  <p><a href="/__health" style="color:#0ff;">Check Health JSON</a></p>
</body>
</html>`;
    res.type("html").send(html);
  });

  app.get("/__health", (_req, res) => {
    if (!isDev) {
      return res.status(404).send("Not Found");
    }
    res.json({
      ok: true,
      time: new Date().toISOString(),
      pid: process.pid,
      env: process.env.NODE_ENV || "development"
    });
  });

  app.post("/api/upload", (req, res, next) => {
    textUpload.single("file")(req, res, (err: any) => {
      if (err) {
        if (err.message === "USE_PDF_ENDPOINT") {
          return res.status(415).json({
            type: "USE_PDF_ENDPOINT",
            message: "For PDF files, use POST /api/upload/pdf instead.",
            redirect: "/api/upload/pdf"
          });
        }
        if (err.message === "UNSUPPORTED_TYPE") {
          return res.status(415).json({
            type: "UNSUPPORTED_MEDIA_TYPE",
            message: "Unsupported file type. Only .txt and .md files are supported.",
            supported_types: ALLOWED_TEXT_EXTENSIONS
          });
        }
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            type: "FILE_TOO_LARGE",
            message: `File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
          });
        }
        return next(err);
      }
      
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          type: "VALIDATION_ERROR",
          message: "No file provided. Include a file in the 'file' field."
        });
      }
      
      const text = file.buffer.toString("utf-8");
      
      res.json({
        filename: file.originalname,
        text,
        size: file.size,
        mimeType: file.mimetype
      });
    });
  });

  app.post("/api/upload/pdf", (req, res, next) => {
    pdfUpload.single("file")(req, res, async (err: any) => {
      if (err) {
        if (err.message === "NOT_A_PDF") {
          return res.status(415).json({
            type: "UNSUPPORTED_MEDIA_TYPE",
            error: "NOT_A_PDF",
            code: 415,
            message: "Only PDF files are accepted at this endpoint."
          });
        }
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            type: "FILE_TOO_LARGE",
            error: "FILE_TOO_LARGE",
            code: 413,
            message: `File exceeds maximum size of ${MAX_PDF_SIZE / 1024 / 1024}MB`
          });
        }
        return next(err);
      }
      
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          type: "VALIDATION_ERROR",
          error: "NO_FILE",
          code: 400,
          message: "No file provided. Include a PDF file in the 'file' field."
        });
      }
      
      try {
        const pdfParser = new PDFParser(null, true);
        
        const parseResult = await new Promise<{ text: string; pages: number }>((resolve, reject) => {
          pdfParser.on("pdfParser_dataError", (errData: any) => {
            reject(new Error(errData.parserError || "PDF parsing failed"));
          });
          
          pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
            const pages = pdfData.Pages || [];
            let text = "";
            
            for (const page of pages) {
              const texts = page.Texts || [];
              for (const textItem of texts) {
                const runs = textItem.R || [];
                for (const run of runs) {
                  if (run.T) {
                    text += decodeURIComponent(run.T) + " ";
                  }
                }
              }
              text += "\n";
            }
            
            resolve({ text: text.trim(), pages: pages.length });
          });
          
          pdfParser.parseBuffer(file.buffer);
        });
        
        const text = parseResult.text;
        
        if (text.length < MIN_TEXT_LENGTH) {
          return res.status(422).json({
            type: "UNPROCESSABLE_ENTITY",
            error: "IMAGE_BASED_PDF",
            code: 422,
            message: "PDF appears image-based; OCR not implemented yet. Please use a text-based PDF or paste the content manually.",
            charCount: text.length
          });
        }
        
        console.log(`[PDF Upload] Extracted ${text.length} chars from ${file.originalname}`);
        
        res.json({
          filename: file.originalname,
          text,
          pages: parseResult.pages,
          charCount: text.length
        });
      } catch (parseError: any) {
        console.error("[PDF Upload] Parse error:", parseError.message);
        return res.status(422).json({
          type: "PARSE_ERROR",
          error: "PDF_PARSE_FAILED",
          code: 422,
          message: "Failed to extract text from PDF. The file may be corrupted or password-protected."
        });
      }
    });
  });

  app.post("/api/cases", asyncHandler(async (req, res) => {
    const parsed = insertCaseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        type: "VALIDATION_ERROR",
        errors: parsed.error.errors 
      });
    }
    
    if (!parsed.data.name || parsed.data.name.trim() === "") {
      return res.status(400).json({
        type: "CONTEXT_REQUIRED",
        missing_fields: ["name"],
        next_actions: ["Provide a case name"]
      });
    }
    
    const newCase = await storage.createCase(parsed.data);
    res.status(201).json(newCase);
  }));

  app.get("/api/cases", asyncHandler(async (_req, res) => {
    const allCases = await storage.listCases();
    res.json(allCases);
  }));

  app.get("/api/cases/:caseId", asyncHandler(async (req, res) => {
    const caseId = req.params.caseId as string;
    const caseData = await storage.getCase(caseId);
    
    if (!caseData) {
      return res.status(404).json({ 
        type: "NOT_FOUND",
        message: "Case not found" 
      });
    }
    
    res.json(caseData);
  }));

  app.patch("/api/cases/:caseId", asyncHandler(async (req, res) => {
    const caseId = req.params.caseId as string;
    const existing = await storage.getCase(caseId);
    
    if (!existing) {
      return res.status(404).json({ 
        type: "NOT_FOUND",
        message: "Case not found" 
      });
    }
    
    if (existing.status === "sealed") {
      return res.status(403).json({
        type: "SEALED",
        message: "Cannot modify a sealed case"
      });
    }
    
    const allowedFields = ["name", "status", "decisionTarget", "decisionTime"];
    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in req.body) {
        updateData[field] = req.body[field];
      }
    }
    
    const updated = await storage.updateCase(caseId, updateData);
    res.json(updated);
  }));

  app.delete("/api/cases/:caseId", asyncHandler(async (req, res) => {
    const caseId = req.params.caseId as string;
    const success = await storage.archiveCase(caseId);
    
    if (!success) {
      return res.status(404).json({ 
        type: "NOT_FOUND",
        message: "Case not found" 
      });
    }
    
    res.json({ archived: true });
  }));

  app.post("/api/cases/:caseId/uploads/init", asyncHandler(async (req, res) => {
    const caseId = req.params.caseId as string;
    
    const caseData = await storage.getCase(caseId);
    if (!caseData) {
      return res.status(404).json({
        type: "CONTEXT_REQUIRED",
        missing_fields: ["valid caseId"],
        next_actions: ["Select or create a case first"]
      });
    }
    
    if (caseData.status === "sealed") {
      return res.status(403).json({
        type: "SEALED",
        message: "Cannot upload to a sealed case"
      });
    }
    
    const { filename, mimeType, evidenceType, sourceLabel } = req.body;
    
    if (!filename || !mimeType) {
      return res.status(400).json({
        type: "CONTEXT_REQUIRED",
        missing_fields: [!filename ? "filename" : null, !mimeType ? "mimeType" : null].filter(Boolean),
        next_actions: ["Provide filename and mimeType"]
      });
    }
    
    const validEvidenceTypes = ["document", "photo", "scan", "note", "other"];
    const finalEvidenceType = validEvidenceTypes.includes(evidenceType) ? evidenceType : "document";
    
    const upload = await storage.createUpload({
      caseId,
      filename,
      mimeType,
      evidenceType: finalEvidenceType,
      sourceLabel: sourceLabel || null,
      ingestionState: "uploaded"
    });
    
    res.status(201).json({
      uploadId: upload.id,
      uploadUrl: `/api/cases/${caseId}/uploads/${upload.id}/data`,
      method: "PUT"
    });
  }));

  app.put("/api/cases/:caseId/uploads/:uploadId/data", asyncHandler(async (req, res) => {
    const caseId = req.params.caseId as string;
    const uploadId = req.params.uploadId as string;
    
    const upload = await storage.getUpload(uploadId);
    if (!upload || upload.caseId !== caseId) {
      return res.status(404).json({
        type: "NOT_FOUND",
        message: "Upload not found"
      });
    }
    
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    const sha256 = computeSha256(buffer);
    const storagePath = join(UPLOADS_DIR, `${uploadId}_${upload.filename}`);
    
    await writeFile(storagePath, buffer);
    
    await storage.updateUpload(uploadId, {
      sha256,
      storagePath,
      fileSize: buffer.length,
      ingestionState: "stored"
    });
    
    const updated = await storage.getUpload(uploadId);
    res.json(updated);
  }));

  app.post("/api/cases/:caseId/uploads/complete", asyncHandler(async (req, res) => {
    const caseId = req.params.caseId as string;
    const { uploadId } = req.body;
    
    if (!uploadId) {
      return res.status(400).json({
        type: "CONTEXT_REQUIRED",
        missing_fields: ["uploadId"],
        next_actions: ["Provide the uploadId from init"]
      });
    }
    
    const upload = await storage.getUpload(uploadId);
    if (!upload || upload.caseId !== caseId) {
      return res.status(404).json({
        type: "NOT_FOUND",
        message: "Upload not found"
      });
    }
    
    if (upload.ingestionState !== "stored") {
      return res.status(400).json({
        type: "INVALID_STATE",
        message: `Upload is in state '${upload.ingestionState}', expected 'stored'`
      });
    }
    
    await storage.updateUploadState(uploadId, "extracted");
    
    const updated = await storage.getUpload(uploadId);
    res.json({
      upload: updated,
      message: "Upload complete, ingestion started"
    });
  }));

  app.get("/api/cases/:caseId/uploads", asyncHandler(async (req, res) => {
    const caseId = req.params.caseId as string;
    
    const caseData = await storage.getCase(caseId);
    if (!caseData) {
      return res.status(404).json({
        type: "CONTEXT_REQUIRED",
        missing_fields: ["valid caseId"],
        next_actions: ["Select or create a case first"]
      });
    }
    
    const uploadsList = await storage.listUploadsForCase(caseId);
    res.json(uploadsList);
  }));

  app.get("/api/cases/:caseId/uploads/:uploadId", asyncHandler(async (req, res) => {
    const caseId = req.params.caseId as string;
    const uploadId = req.params.uploadId as string;
    
    const upload = await storage.getUpload(uploadId);
    if (!upload || upload.caseId !== caseId) {
      return res.status(404).json({
        type: "NOT_FOUND",
        message: "Upload not found"
      });
    }
    
    res.json(upload);
  }));

  app.patch("/api/cases/:caseId/uploads/:uploadId/state", asyncHandler(async (req, res) => {
    const caseId = req.params.caseId as string;
    const uploadId = req.params.uploadId as string;
    const { state } = req.body;
    
    const validStates = ingestionStateEnum.options;
    if (!validStates.includes(state)) {
      return res.status(400).json({
        type: "VALIDATION_ERROR",
        message: `Invalid state. Must be one of: ${validStates.join(", ")}`
      });
    }
    
    const upload = await storage.getUpload(uploadId);
    if (!upload || upload.caseId !== caseId) {
      return res.status(404).json({
        type: "NOT_FOUND",
        message: "Upload not found"
      });
    }
    
    const updated = await storage.updateUploadState(uploadId, state);
    res.json(updated);
  }));

  app.get("/api/cases/:caseId/chunks", asyncHandler(async (req, res) => {
    const caseId = req.params.caseId as string;
    
    const caseData = await storage.getCase(caseId);
    if (!caseData) {
      return res.status(404).json({
        type: "CONTEXT_REQUIRED",
        missing_fields: ["valid caseId"],
        next_actions: ["Select or create a case first"]
      });
    }
    
    const chunksList = await storage.listChunksForCase(caseId);
    res.json(chunksList);
  }));

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("API Error:", err);
    
    if (isDev) {
      res.status(500).json({
        type: "SERVER_ERROR",
        message: err.message,
        stack: err.stack
      });
    } else {
      res.status(500).json({
        type: "SERVER_ERROR",
        message: "Internal server error"
      });
    }
  });

  return httpServer;
}
