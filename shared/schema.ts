import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, index, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const caseStatusEnum = z.enum(["active", "sealed", "archived"]);
export type CaseStatus = z.infer<typeof caseStatusEnum>;

export const cases = pgTable("cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  decisionTarget: text("decision_target"),
  decisionTime: text("decision_time"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("cases_status_idx").on(table.status),
  index("cases_created_at_idx").on(table.createdAt),
]);

export const insertCaseSchema = createInsertSchema(cases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof cases.$inferSelect;

export const ingestionStateEnum = z.enum([
  "uploaded",
  "stored",
  "extracted",
  "chunked",
  "indexed",
  "ready",
  "failed_storing",
  "failed_extraction",
  "failed_chunking",
  "failed_indexing"
]);
export type IngestionState = z.infer<typeof ingestionStateEnum>;

export const evidenceTypeEnum = z.enum([
  "document",
  "photo",
  "scan",
  "note",
  "other"
]);
export type EvidenceType = z.infer<typeof evidenceTypeEnum>;

export const uploads = pgTable("uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  evidenceType: text("evidence_type").notNull().default("document"),
  sourceLabel: text("source_label"),
  sha256: text("sha256"),
  ingestionState: text("ingestion_state").notNull().default("uploaded"),
  storagePath: text("storage_path"),
  fileSize: integer("file_size"),
  pageCount: integer("page_count"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("uploads_case_id_idx").on(table.caseId),
  index("uploads_case_created_idx").on(table.caseId, table.createdAt),
  index("uploads_ingestion_state_idx").on(table.ingestionState),
]);

export const insertUploadSchema = createInsertSchema(uploads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type InsertUpload = z.infer<typeof insertUploadSchema>;
export type Upload = typeof uploads.$inferSelect;

export const uploadPages = pgTable("upload_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  uploadId: varchar("upload_id").notNull().references(() => uploads.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number").notNull(),
  storagePath: text("storage_path"),
  sha256: text("sha256"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("upload_pages_upload_id_idx").on(table.uploadId),
  index("upload_pages_upload_page_idx").on(table.uploadId, table.pageNumber),
]);

export const insertUploadPageSchema = createInsertSchema(uploadPages).omit({
  id: true,
  createdAt: true,
  deletedAt: true,
});

export type InsertUploadPage = z.infer<typeof insertUploadPageSchema>;
export type UploadPage = typeof uploadPages.$inferSelect;

export const chunks = pgTable("chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  uploadId: varchar("upload_id").notNull().references(() => uploads.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number"),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  embedding: text("embedding"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("chunks_case_id_idx").on(table.caseId),
  index("chunks_upload_id_idx").on(table.uploadId),
  index("chunks_case_upload_idx").on(table.caseId, table.uploadId),
]);

export const insertChunkSchema = createInsertSchema(chunks).omit({
  id: true,
  createdAt: true,
  deletedAt: true,
});

export type InsertChunk = z.infer<typeof insertChunkSchema>;
export type Chunk = typeof chunks.$inferSelect;

// Extraction job states
export const extractionJobStateEnum = z.enum([
  "queued",
  "parsing",
  "extracting", 
  "sanitizing",
  "scoring",
  "packaging",
  "complete",
  "failed"
]);
export type ExtractionJobState = z.infer<typeof extractionJobStateEnum>;

// Extraction jobs table for durable job processing
export const extractionJobs = pgTable("extraction_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  state: text("state").notNull().default("queued"),
  progress: integer("progress").notNull().default(0),
  sourceText: text("source_text").notNull(),
  metadata: text("metadata").notNull(), // JSON string
  options: text("options"), // JSON string
  packId: text("pack_id"),
  packData: text("pack_data"), // JSON string of completed pack
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("extraction_jobs_state_idx").on(table.state),
  index("extraction_jobs_created_at_idx").on(table.createdAt),
]);

export const insertExtractionJobSchema = createInsertSchema(extractionJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertExtractionJob = z.infer<typeof insertExtractionJobSchema>;
export type ExtractionJob = typeof extractionJobs.$inferSelect;

// Claim classification enum
export const claimClassificationEnum = z.enum(["DEFENSIBLE", "RESTRICTED", "AMBIGUOUS"]);
export type ClaimClassification = z.infer<typeof claimClassificationEnum>;

// Claim schema for snapshots
export const claimSchema = z.object({
  id: z.string(),
  classification: claimClassificationEnum,
  text: z.string(),
  confidence: z.number().min(0).max(0.99),
  refusal_reason: z.string().nullable(),
  anchor_ids: z.array(z.string()),
});
export type SnapshotClaim = z.infer<typeof claimSchema>;

// Snapshots table for claim governance
export const snapshots = pgTable("snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  corpusId: text("corpus_id").notNull(),
  snapshotJson: text("snapshot_json").notNull(),
  hashAlg: text("hash_alg").notNull().default("SHA-256"),
  hashHex: text("hash_hex").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("snapshots_corpus_id_idx").on(table.corpusId),
  index("snapshots_created_at_idx").on(table.createdAt),
]);

export const insertSnapshotSchema = createInsertSchema(snapshots).omit({
  id: true,
  createdAt: true,
});

export type InsertSnapshot = z.infer<typeof insertSnapshotSchema>;
export type Snapshot = typeof snapshots.$inferSelect;

// Anchor schema
export const anchorSchema = z.object({
  id: z.string(),
  quote: z.string(),
  source_document: z.string(),
  page_ref: z.string(),
  section_ref: z.string().nullable().optional(),
  timeline_date: z.string(),
});
export type Anchor = z.infer<typeof anchorSchema>;

// Corpus purpose enum
export const corpusPurposeEnum = z.enum([
  "Litigation support",
  "Investigative journalism",
  "Compliance/Internal Review",
  "Research/Exploratory"
]);
export type CorpusPurpose = z.infer<typeof corpusPurposeEnum>;

// Source role enum
export const sourceRoleEnum = z.enum(["PRIMARY", "SECONDARY"]);
export type SourceRole = z.infer<typeof sourceRoleEnum>;

// Corpus table
export const corpora = pgTable("corpora", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  purpose: text("purpose").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("corpora_created_at_idx").on(table.createdAt),
]);

export const insertCorpusSchema = createInsertSchema(corpora).omit({
  id: true,
  createdAt: true,
});

export type InsertCorpus = z.infer<typeof insertCorpusSchema>;
export type Corpus = typeof corpora.$inferSelect;

// Corpus sources table
export const corpusSources = pgTable("corpus_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  corpusId: varchar("corpus_id").notNull().references(() => corpora.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  filename: text("filename").notNull(),
  sha256Hex: text("sha256_hex").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
}, (table) => [
  index("corpus_sources_corpus_id_idx").on(table.corpusId),
]);

export const insertCorpusSourceSchema = createInsertSchema(corpusSources).omit({
  id: true,
  uploadedAt: true,
});

export type InsertCorpusSource = z.infer<typeof insertCorpusSourceSchema>;
export type CorpusSource = typeof corpusSources.$inferSelect;

// Anchor records table (corpus-bound)
export const anchorRecords = pgTable("anchor_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  corpusId: varchar("corpus_id").notNull().references(() => corpora.id, { onDelete: "cascade" }),
  sourceId: varchar("source_id").notNull().references(() => corpusSources.id, { onDelete: "cascade" }),
  quote: text("quote").notNull(),
  sourceDocument: text("source_document").notNull(),
  pageRef: text("page_ref").notNull(),
  sectionRef: text("section_ref"),
  timelineDate: text("timeline_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("anchor_records_corpus_id_idx").on(table.corpusId),
  index("anchor_records_source_id_idx").on(table.sourceId),
]);

export const insertAnchorRecordSchema = createInsertSchema(anchorRecords).omit({
  id: true,
  createdAt: true,
});

export type InsertAnchorRecord = z.infer<typeof insertAnchorRecordSchema>;
export type AnchorRecord = typeof anchorRecords.$inferSelect;

// Build mode enum
export const buildModeEnum = z.enum(["anchors_only", "claims_from_anchors"]);
