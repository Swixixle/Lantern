import { 
  type User, type InsertUser,
  type Case, type InsertCase,
  type Upload, type InsertUpload,
  type UploadPage, type InsertUploadPage,
  type Chunk, type InsertChunk,
  type ExtractionJob, type InsertExtractionJob,
  type ExtractionJobState,
  users, cases, uploads, uploadPages, chunks, extractionJobs
} from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, isNull, desc } from "drizzle-orm";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createCase(data: InsertCase): Promise<Case>;
  getCase(id: string): Promise<Case | undefined>;
  listCases(): Promise<Case[]>;
  updateCase(id: string, data: Partial<InsertCase>): Promise<Case | undefined>;
  archiveCase(id: string): Promise<boolean>;
  
  createUpload(data: InsertUpload): Promise<Upload>;
  getUpload(id: string): Promise<Upload | undefined>;
  listUploadsForCase(caseId: string): Promise<Upload[]>;
  updateUploadState(id: string, state: string): Promise<Upload | undefined>;
  updateUpload(id: string, data: Partial<InsertUpload>): Promise<Upload | undefined>;
  
  createUploadPage(data: InsertUploadPage): Promise<UploadPage>;
  listPagesForUpload(uploadId: string): Promise<UploadPage[]>;
  
  createChunk(data: InsertChunk): Promise<Chunk>;
  listChunksForUpload(uploadId: string): Promise<Chunk[]>;
  listChunksForCase(caseId: string): Promise<Chunk[]>;
  
  // Extraction jobs
  createExtractionJob(data: InsertExtractionJob): Promise<ExtractionJob>;
  getExtractionJob(id: string): Promise<ExtractionJob | undefined>;
  updateExtractionJobState(id: string, state: ExtractionJobState, progress: number): Promise<ExtractionJob | undefined>;
  completeExtractionJob(id: string, packId: string, packData: string): Promise<ExtractionJob | undefined>;
  failExtractionJob(id: string, errorCode: string, errorMessage: string): Promise<ExtractionJob | undefined>;
  listPendingExtractionJobs(): Promise<ExtractionJob[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async createCase(data: InsertCase): Promise<Case> {
    const result = await db.insert(cases).values(data).returning();
    return result[0];
  }

  async getCase(id: string): Promise<Case | undefined> {
    const result = await db.select().from(cases)
      .where(and(eq(cases.id, id), isNull(cases.deletedAt)))
      .limit(1);
    return result[0];
  }

  async listCases(): Promise<Case[]> {
    return db.select().from(cases)
      .where(isNull(cases.deletedAt))
      .orderBy(desc(cases.createdAt));
  }

  async updateCase(id: string, data: Partial<InsertCase>): Promise<Case | undefined> {
    const result = await db.update(cases)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cases.id, id))
      .returning();
    return result[0];
  }

  async archiveCase(id: string): Promise<boolean> {
    const result = await db.update(cases)
      .set({ deletedAt: new Date(), status: "archived" })
      .where(eq(cases.id, id))
      .returning();
    return result.length > 0;
  }

  async createUpload(data: InsertUpload): Promise<Upload> {
    const result = await db.insert(uploads).values(data).returning();
    return result[0];
  }

  async getUpload(id: string): Promise<Upload | undefined> {
    const result = await db.select().from(uploads)
      .where(and(eq(uploads.id, id), isNull(uploads.deletedAt)))
      .limit(1);
    return result[0];
  }

  async listUploadsForCase(caseId: string): Promise<Upload[]> {
    return db.select().from(uploads)
      .where(and(eq(uploads.caseId, caseId), isNull(uploads.deletedAt)))
      .orderBy(desc(uploads.createdAt));
  }

  async updateUploadState(id: string, state: string): Promise<Upload | undefined> {
    const result = await db.update(uploads)
      .set({ ingestionState: state, updatedAt: new Date() })
      .where(eq(uploads.id, id))
      .returning();
    return result[0];
  }

  async updateUpload(id: string, data: Partial<InsertUpload>): Promise<Upload | undefined> {
    const result = await db.update(uploads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(uploads.id, id))
      .returning();
    return result[0];
  }

  async createUploadPage(data: InsertUploadPage): Promise<UploadPage> {
    const result = await db.insert(uploadPages).values(data).returning();
    return result[0];
  }

  async listPagesForUpload(uploadId: string): Promise<UploadPage[]> {
    return db.select().from(uploadPages)
      .where(and(eq(uploadPages.uploadId, uploadId), isNull(uploadPages.deletedAt)))
      .orderBy(uploadPages.pageNumber);
  }

  async createChunk(data: InsertChunk): Promise<Chunk> {
    const result = await db.insert(chunks).values(data).returning();
    return result[0];
  }

  async listChunksForUpload(uploadId: string): Promise<Chunk[]> {
    return db.select().from(chunks)
      .where(and(eq(chunks.uploadId, uploadId), isNull(chunks.deletedAt)))
      .orderBy(chunks.chunkIndex);
  }

  async listChunksForCase(caseId: string): Promise<Chunk[]> {
    return db.select().from(chunks)
      .where(and(eq(chunks.caseId, caseId), isNull(chunks.deletedAt)))
      .orderBy(chunks.uploadId, chunks.chunkIndex);
  }

  // Extraction jobs
  async createExtractionJob(data: InsertExtractionJob): Promise<ExtractionJob> {
    const result = await db.insert(extractionJobs).values(data).returning();
    return result[0];
  }

  async getExtractionJob(id: string): Promise<ExtractionJob | undefined> {
    const result = await db.select().from(extractionJobs)
      .where(eq(extractionJobs.id, id))
      .limit(1);
    return result[0];
  }

  async updateExtractionJobState(id: string, state: ExtractionJobState, progress: number): Promise<ExtractionJob | undefined> {
    const result = await db.update(extractionJobs)
      .set({ state, progress, updatedAt: new Date() })
      .where(eq(extractionJobs.id, id))
      .returning();
    return result[0];
  }

  async completeExtractionJob(id: string, packId: string, packData: string): Promise<ExtractionJob | undefined> {
    const result = await db.update(extractionJobs)
      .set({ 
        state: "complete", 
        progress: 100,
        packId, 
        packData, 
        updatedAt: new Date(),
        completedAt: new Date()
      })
      .where(eq(extractionJobs.id, id))
      .returning();
    return result[0];
  }

  async failExtractionJob(id: string, errorCode: string, errorMessage: string): Promise<ExtractionJob | undefined> {
    const result = await db.update(extractionJobs)
      .set({ 
        state: "failed", 
        errorCode, 
        errorMessage, 
        updatedAt: new Date(),
        completedAt: new Date()
      })
      .where(eq(extractionJobs.id, id))
      .returning();
    return result[0];
  }

  async listPendingExtractionJobs(): Promise<ExtractionJob[]> {
    // Return all non-terminal states to resume jobs after server restart
    const nonTerminalStates = ["queued", "parsing", "extracting", "sanitizing", "scoring", "packaging"];
    const result = await db.select().from(extractionJobs)
      .orderBy(extractionJobs.createdAt);
    return result.filter(job => nonTerminalStates.includes(job.state));
  }
}

export const storage = new DatabaseStorage();
