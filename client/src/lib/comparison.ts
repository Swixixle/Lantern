import { Pack, Entity } from "./schema/pack_v1";
import { computeFundingGravity } from "./heuristics/fundingGravity";
import { computeEnforcementMap } from "./heuristics/enforcementMap";
import { computeInfluenceHubs } from "./heuristics/influenceHubs";

export interface EntityMatch {
    name: string;
    entityA: Entity;
    entityB: Entity;
    confidence: "exact_id" | "exact_name" | "fuzzy_name";
}

export interface ComparisonResult {
    packA: { id: string; name: string; date: string };
    packB: { id: string; name: string; date: string };
    generatedAt: string;
    
    // Entity Overlap
    sharedEntities: EntityMatch[];
    overlapScore: number; // 0..1 (Jaccard index of entities)

    // Structural Alignment
    commonFunders: { name: string; rankA: number; rankB: number }[];
    commonEnforcers: { name: string; rankA: number; rankB: number }[];
    commonHubs: { name: string; rankA: number; rankB: number }[];
}

export function comparePacks(packA: Pack, packB: Pack): ComparisonResult {
    // 1. Entity Overlap
    const sharedEntities: EntityMatch[] = [];
    const mapA = new Map<string, Entity>();
    
    // Index A by ID and Name
    packA.entities.forEach(e => {
        mapA.set(e.id, e);
        mapA.set(e.name.toLowerCase().trim(), e);
    });

    // Check B against A
    packB.entities.forEach(eB => {
        const nameKey = eB.name.toLowerCase().trim();
        
        // Try ID match first (strongest)
        if (mapA.has(eB.id)) {
            sharedEntities.push({
                name: eB.name,
                entityA: mapA.get(eB.id)!,
                entityB: eB,
                confidence: "exact_id"
            });
            return;
        }

        // Try Name match
        if (mapA.has(nameKey)) {
            // Check if we already matched this ID (to avoid double counting if ID and Name match independently - rare but possible)
            // Ideally we tracked matched IDs. 
            // For v1, let's just push.
            sharedEntities.push({
                name: eB.name,
                entityA: mapA.get(nameKey)!,
                entityB: eB,
                confidence: "exact_name"
            });
        }
    });

    // Jaccard Index: Intersection / Union
    const intersection = sharedEntities.length;
    const union = packA.entities.length + packB.entities.length - intersection;
    const overlapScore = union > 0 ? intersection / union : 0;

    // 2. Heuristic Alignment
    // We need to run heuristics to get rankings
    const heuristicsA = {
        funding: computeFundingGravity(packA),
        enforcement: computeEnforcementMap(packA),
        influence: computeInfluenceHubs(packA)
    };
    
    const heuristicsB = {
        funding: computeFundingGravity(packB),
        enforcement: computeEnforcementMap(packB),
        influence: computeInfluenceHubs(packB)
    };

    // Helper to find common ranked items
    const findCommonRanked = (
        listA: { entityId: string }[], 
        listB: { entityId: string }[],
        getRank: (index: number) => number
    ) => {
        const common: { name: string; rankA: number; rankB: number }[] = [];
        
        listA.forEach((itemA, indexA) => {
            const entityA = packA.entities.find(e => e.id === itemA.entityId);
            if (!entityA) return;

            // Find in B (via sharedEntities map to handle ID vs Name mismatch)
            // 1. Is this entity in our shared list?
            const match = sharedEntities.find(m => m.entityA.id === entityA.id);
            if (!match) return;

            // 2. Is the matched entity in listB?
            const indexB = listB.findIndex(itemB => itemB.entityId === match.entityB.id);
            if (indexB !== -1) {
                common.push({
                    name: entityA.name,
                    rankA: getRank(indexA),
                    rankB: getRank(indexB)
                });
            }
        });
        return common;
    };

    const commonFunders = findCommonRanked(heuristicsA.funding.funders, heuristicsB.funding.funders, i => i + 1);
    const commonEnforcers = findCommonRanked(heuristicsA.enforcement.enforcers, heuristicsB.enforcement.enforcers, i => i + 1);
    const commonHubs = findCommonRanked(heuristicsA.influence.results, heuristicsB.influence.results, i => i + 1);

    return {
        packA: { id: packA.packId, name: packA.subjectName, date: packA.createdAt },
        packB: { id: packB.packId, name: packB.subjectName, date: packB.createdAt },
        generatedAt: new Date().toISOString(),
        sharedEntities,
        overlapScore,
        commonFunders,
        commonEnforcers,
        commonHubs
    };
}
