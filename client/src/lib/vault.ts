import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { persistence, type LibraryState, type AnyPack } from "./storage";

export interface CaseMeta {
  caseId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  packCount: number;
  storageMode: "LOCAL_VAULT";
}

export interface CaseRecord {
  caseId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  packs: AnyPack[];
  metadata: Record<string, unknown>;
}

interface VaultDBSchema extends DBSchema {
  cases: {
    key: string;
    value: CaseRecord;
    indexes: { "by-updated": string };
  };
  vault_meta: {
    key: string;
    value: { key: string; value: string };
  };
}

const VAULT_DB_NAME = "lantern-vault";
const VAULT_DB_VERSION = 1;

let vaultDbPromise: Promise<IDBPDatabase<VaultDBSchema>> | null = null;

function getVaultDB() {
  if (!vaultDbPromise) {
    vaultDbPromise = openDB<VaultDBSchema>(VAULT_DB_NAME, VAULT_DB_VERSION, {
      upgrade(db) {
        const caseStore = db.createObjectStore("cases", { keyPath: "caseId" });
        caseStore.createIndex("by-updated", "updatedAt");
        db.createObjectStore("vault_meta", { keyPath: "key" });
      },
    });
  }
  return vaultDbPromise;
}

export const vault = {
  async listCases(): Promise<CaseMeta[]> {
    const db = await getVaultDB();
    const all = await db.getAll("cases");
    return all
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((c) => ({
        caseId: c.caseId,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        packCount: c.packs.length,
        storageMode: "LOCAL_VAULT" as const,
      }));
  },

  async getCase(caseId: string): Promise<CaseRecord | null> {
    const db = await getVaultDB();
    return (await db.get("cases", caseId)) ?? null;
  },

  async saveCase(record: CaseRecord): Promise<void> {
    const db = await getVaultDB();
    record.updatedAt = new Date().toISOString();
    await db.put("cases", record);
  },

  async deleteCase(caseId: string): Promise<void> {
    const db = await getVaultDB();
    await db.delete("cases", caseId);
  },

  async exportCase(caseId: string): Promise<Blob> {
    const record = await this.getCase(caseId);
    if (!record) throw new Error(`Case ${caseId} not found`);
    const json = JSON.stringify(record, null, 2);
    return new Blob([json], { type: "application/json" });
  },

  async getMeta(key: string): Promise<string | null> {
    const db = await getVaultDB();
    const row = await db.get("vault_meta", key);
    return row?.value ?? null;
  },

  async setMeta(key: string, value: string): Promise<void> {
    const db = await getVaultDB();
    await db.put("vault_meta", { key, value });
  },

  async getStorageMode(): Promise<string> {
    return "LOCAL_VAULT";
  },

  async getLastSaved(caseId: string): Promise<string | null> {
    const record = await this.getCase(caseId);
    return record?.updatedAt ?? null;
  },
};

const MIGRATION_KEYS = [
  "lantern_api_key",
  "lantern_tutorial_completed",
  "lantern_tutorial_step",
  "stage1_unlocked",
  "stage1_items",
  "lantern_lens",
];

export async function migrateLocalStorageToVault(): Promise<void> {
  const migrated = await vault.getMeta("ls_migrated");
  if (migrated === "true") return;

  for (const key of MIGRATION_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      await vault.setMeta(`ls_${key}`, value);
    }
  }

  await vault.setMeta("ls_migrated", "true");
}
