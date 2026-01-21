import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { LanternPack } from "./lanternExtract";

// --- Types ---

export interface LanternSchema extends DBSchema {
  meta: {
    key: string;
    value: any;
  };
  packs: {
    key: string; // pack_id
    value: LanternPack;
  };
}

export type LibraryState = {
  schemaVersion: number;
  updatedAt: string;
  packs: LanternPack[];
};

export type StorageStatus = "idle" | "saving" | "saved" | "error";

const DB_NAME = "lantern-db";
const DB_VERSION = 1;
const SCHEMA_VERSION = 1;

// --- Core Storage Module ---

let dbPromise: Promise<IDBPDatabase<LanternSchema>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<LanternSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("packs")) {
          db.createObjectStore("packs", { keyPath: "pack_id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

// --- Migrations ---

function migrate(pack: any): LanternPack {
    // Identity migration for v1
    // Future: check pack.schema or structure and transform
    if (!pack.schema) pack.schema = "lantern.extract.pack.v1";
    return pack as LanternPack;
}

// --- API ---

export const storage = {
  async loadLibrary(): Promise<LibraryState> {
    try {
      const db = await getDB();
      const tx = db.transaction(["packs", "meta"], "readonly");
      
      const packs = await tx.objectStore("packs").getAll();
      const metaVersion = await tx.objectStore("meta").get("schemaVersion");
      const metaUpdated = await tx.objectStore("meta").get("updatedAt");
      
      await tx.done;

      // Migration on Read (Lazy)
      const migratedPacks = packs.map(migrate);

      return {
        schemaVersion: typeof metaVersion === 'number' ? metaVersion : SCHEMA_VERSION,
        updatedAt: typeof metaUpdated === 'string' ? metaUpdated : new Date().toISOString(),
        packs: migratedPacks
      };
    } catch (err) {
      console.error("Storage Load Error:", err);
      // Fallback or rethrow based on severity. For now return empty.
      return { schemaVersion: SCHEMA_VERSION, updatedAt: new Date().toISOString(), packs: [] };
    }
  },

  async saveLibrary(packs: LanternPack[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(["packs", "meta"], "readwrite");
    
    // 1. Update Meta
    await tx.objectStore("meta").put(SCHEMA_VERSION, "schemaVersion");
    await tx.objectStore("meta").put(new Date().toISOString(), "updatedAt");

    // 2. Sync Packs (Naive: Clear & Put All for correctness in this MVP phase, 
    //    Optimization: Diffing logic would go here in M5)
    //    Actually, lets be smarter: Put all, we rely on IDs. 
    //    But we need to handle deletions. The React State is authoritative for the "Library" view.
    //    So we should reconcile.
    //    Strategy: Clear Store -> Put All (Safe, simple for MVP < 100MB)
    
    await tx.objectStore("packs").clear();
    for (const pack of packs) {
        await tx.objectStore("packs").put(pack);
    }

    await tx.done;
  },
  
  async savePack(pack: LanternPack): Promise<void> {
      // Incremental Save
      const db = await getDB();
      const tx = db.transaction(["packs", "meta"], "readwrite");
      await tx.objectStore("packs").put(pack);
      await tx.objectStore("meta").put(new Date().toISOString(), "updatedAt");
      await tx.done;
  },
  
  async deletePacks(packIds: string[]): Promise<void> {
      const db = await getDB();
      const tx = db.transaction(["packs", "meta"], "readwrite");
      const store = tx.objectStore("packs");
      for(const id of packIds) {
          await store.delete(id);
      }
      await tx.objectStore("meta").put(new Date().toISOString(), "updatedAt");
      await tx.done;
  },

  async clearLibrary(): Promise<void> {
    const db = await getDB();
    await db.clear("packs");
    await db.clear("meta");
  }
};

// --- Coalescing (Debounce) ---

let saveTimeout: NodeJS.Timeout | null = null;
const DEBOUNCE_MS = 1000;

export const debouncedSave = (packs: LanternPack[], onStatus: (s: StorageStatus) => void) => {
    onStatus("saving");
    if (saveTimeout) clearTimeout(saveTimeout);
    
    saveTimeout = setTimeout(async () => {
        try {
            await storage.saveLibrary(packs);
            onStatus("saved");
            setTimeout(() => onStatus("idle"), 2000);
        } catch (e) {
            console.error(e);
            onStatus("error");
        }
    }, DEBOUNCE_MS);
};
