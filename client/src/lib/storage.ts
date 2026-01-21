import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { LanternPack } from "./lanternExtract";
import { PackV1, PackV1Schema } from "./schema/pack_v1";

// --- Types ---

// The Discriminated Union
export type AnyPack = LanternPack | PackV1;

export const SCHEMA_VERSION = 1;

// The core data shape
export type LibraryState = {
  packs: AnyPack[];
};

// The persistent record shape
export type PersistentRecord = {
  schemaVersion: number;
  updatedAt: string;
  library: LibraryState;
};

export type StorageStatus = "idle" | "saving" | "saved" | "error";

interface LanternDBSchema extends DBSchema {
  root: {
    key: string;
    value: PersistentRecord;
  };
}

let dbPromise: Promise<IDBPDatabase<LanternDBSchema>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<LanternDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("root");
      },
    });
  }
  return dbPromise;
}

// Migration Stub
function migrate(record: any): PersistentRecord {
    // Identity migration for v1
    if (!record.schemaVersion) {
        return {
            schemaVersion: SCHEMA_VERSION,
            updatedAt: new Date().toISOString(),
            library: { packs: [] }
        };
    }
    return record as PersistentRecord;
}

export const persistence = {
  async loadLibrary(): Promise<LibraryState | null> {
    try {
      const db = await getDB();
      const record = await db.get("root", "main");
      
      if (!record) return null;
      
      const migrated = migrate(record);
      return migrated.library;
    } catch (e) {
      console.error("Failed to load library:", e);
      return null;
    }
  },

  async saveLibrary(library: LibraryState): Promise<void> {
    const db = await getDB();
    const record: PersistentRecord = {
        schemaVersion: SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
        library
    };
    await db.put("root", record, "main");
  },

  async clearLibrary(): Promise<void> {
    const db = await getDB();
    await db.clear("root");
  }
};

// --- Coalescing (Debounce) ---

let saveTimeout: NodeJS.Timeout | null = null;
const DEBOUNCE_MS = 1000;

export const debouncedSave = (
    library: LibraryState, 
    onStatus: (s: StorageStatus) => void
) => {
    onStatus("saving");
    if (saveTimeout) clearTimeout(saveTimeout);
    
    saveTimeout = setTimeout(async () => {
        try {
            await persistence.saveLibrary(library);
            onStatus("saved");
            setTimeout(() => onStatus("idle"), 2000);
        } catch (e) {
            console.error("Save failed:", e);
            onStatus("error");
        }
    }, DEBOUNCE_MS);
};
