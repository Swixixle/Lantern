import { Pack, PackSchema, EdgeTypeEnum } from "./schema/pack_v1";
import { v4 as uuidv4 } from "uuid";

// Legacy Type Definition (Loose)
// We treat V1 as "potentially containing invalid enums"
interface LegacyPackV1 {
    schemaVersion: 1;
    edges: Array<{
        type: string;
        [key: string]: any;
    }>;
    [key: string]: any;
}

export function migratePack(raw: any): Pack {
    // 1. Identity Check: If it's already V2, validate and return
    if (raw.schemaVersion === 2) {
        // In a real app we might do PackSchema.parse(raw) but for speed we trust if version matches
        // unless we want to be strict.
        return raw as Pack;
    }

    // 2. Migration V1 -> V2
    // Goal: Ensure all edge types are valid V2 enums.
    console.log(`Migrating pack ${raw.packId} from v${raw.schemaVersion || 1} to v2`);

    const migrated = { ...raw };
    
    // Fix Edges
    if (migrated.edges && Array.isArray(migrated.edges)) {
        migrated.edges = migrated.edges.map((edge: any) => {
            const isValid = EdgeTypeEnum.safeParse(edge.type).success;
            
            if (!isValid) {
                console.warn(`[Migration] Remapping unknown edge type '${edge.type}' in edge ${edge.id}`);
                return {
                    ...edge,
                    type: "affiliated_with", // Default fallback
                    notes: edge.notes 
                        ? `${edge.notes} (Original type: ${edge.type})` 
                        : `(Original type: ${edge.type})`
                };
            }
            return edge;
        });
    }

    // Bump Version
    migrated.schemaVersion = 2;

    // Validate Final Shape
    try {
        return PackSchema.parse(migrated);
    } catch (e) {
        console.error("Migration failed validation:", e);
        // Fallback: return as is and hope for the best, or throw?
        // Let's throw to prevent corrupt data entering the V2 runtime
        throw new Error(`Migration of pack ${raw.packId} failed validation: ${e}`);
    }
}
