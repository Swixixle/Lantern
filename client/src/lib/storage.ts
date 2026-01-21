import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { LanternPack } from "./lanternExtract";

// --- Configuration ---
// FEATURE FLAG: Controls persistence backend
// Options: "localStorage" (M1 Default) | "indexedDB" (M1.75 Experimental)
export const STORAGE_BACKEND: "localStorage" | "indexedDB" = "localStorage" as "localStorage" | "indexedDB";

const LOCAL_STORAGE_KEY = "lantern_library_v1";

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

// --- LocalStorage Backend (M1) ---

const localStorageImpl = {
  async loadLibrary(): Promise<LibraryState> {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) {
        return { schemaVersion: SCHEMA_VERSION, updatedAt: new Date().toISOString(), packs: [] };
      }
      const data = JSON.parse(raw);
      // Basic validation
      if (!data.packs || !Array.isArray(data.packs)) {
          console.warn("Invalid localStorage format, resetting");
          return { schemaVersion: SCHEMA_VERSION, updatedAt: new Date().toISOString(), packs: [] };
      }
      return data as LibraryState;
    } catch (e) {
      console.error("LocalStorage Load Error:", e);
      return { schemaVersion: SCHEMA_VERSION, updatedAt: new Date().toISOString(), packs: [] };
    }
  },

  async saveLibrary(packs: LanternPack[]): Promise<void> {
    const state: LibraryState = {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      packs
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  },

  async savePack(pack: LanternPack): Promise<void> {
    const current = await this.loadLibrary();
    const existingIndex = current.packs.findIndex(p => p.pack_id === pack.pack_id);
    
    if (existingIndex >= 0) {
      current.packs[existingIndex] = pack;
    } else {
      current.packs.push(pack);
    }
    
    await this.saveLibrary(current.packs);
  },

  async deletePacks(packIds: string[]): Promise<void> {
    const current = await this.loadLibrary();
    const newPacks = current.packs.filter(p => !packIds.includes(p.pack_id));
    await this.saveLibrary(newPacks);
  },

  async clearLibrary(): Promise<void> {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
};

// --- IndexedDB Backend (M1.75 Experimental) ---

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

function migrate(pack: any): LanternPack {
    if (!pack.schema) pack.schema = "lantern.extract.pack.v1";
    return pack as LanternPack;
}

const indexedDBImpl = {
  async loadLibrary(): Promise<LibraryState> {
    try {
      const db = await getDB();
      const tx = db.transaction(["packs", "meta"], "readonly");
      
      const packs = await tx.objectStore("packs").getAll();
      const metaVersion = await tx.objectStore("meta").get("schemaVersion");
      const metaUpdated = await tx.objectStore("meta").get("updatedAt");
      
      await tx.done;

      const migratedPacks = packs.map(migrate);

      return {
        schemaVersion: typeof metaVersion === 'number' ? metaVersion : SCHEMA_VERSION,
        updatedAt: typeof metaUpdated === 'string' ? metaUpdated : new Date().toISOString(),
        packs: migratedPacks
      };
    } catch (err) {
      console.error("Storage Load Error:", err);
      return { schemaVersion: SCHEMA_VERSION, updatedAt: new Date().toISOString(), packs: [] };
    }
  },

  async saveLibrary(packs: LanternPack[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(["packs", "meta"], "readwrite");
    
    await tx.objectStore("meta").put(SCHEMA_VERSION, "schemaVersion");
    await tx.objectStore("meta").put(new Date().toISOString(), "updatedAt");
    
    await tx.objectStore("packs").clear();
    for (const pack of packs) {
        await tx.objectStore("packs").put(pack);
    }

    await tx.done;
  },
  
  async savePack(pack: LanternPack): Promise<void> {
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

// --- Facade ---

export const storage = {
  getBackendName() {
      return STORAGE_BACKEND === "indexedDB" ? "IndexedDB (Exp)" : "LocalStorage";
  },

  async loadLibrary(): Promise<LibraryState> {
    return STORAGE_BACKEND === "indexedDB" ? indexedDBImpl.loadLibrary() : localStorageImpl.loadLibrary();
  },

  async saveLibrary(packs: LanternPack[]): Promise<void> {
    return STORAGE_BACKEND === "indexedDB" ? indexedDBImpl.saveLibrary(packs) : localStorageImpl.saveLibrary(packs);
  },

  async savePack(pack: LanternPack): Promise<void> {
    return STORAGE_BACKEND === "indexedDB" ? indexedDBImpl.savePack(pack) : localStorageImpl.savePack(pack);
  },

  async deletePacks(packIds: string[]): Promise<void> {
    return STORAGE_BACKEND === "indexedDB" ? indexedDBImpl.deletePacks(packIds) : localStorageImpl.deletePacks(packIds);
  },

  async clearLibrary(): Promise<void> {
    return STORAGE_BACKEND === "indexedDB" ? indexedDBImpl.clearLibrary() : localStorageImpl.clearLibrary();
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
