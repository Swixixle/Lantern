export interface HeuristicFinding {
  kind: string;
  packId: string;
  generatedAt: string;
  results: any[];
}

export interface InfluenceHubResult {
  entityId: string;
  degree: number;
  inDegree: number;
  outDegree: number;
  supportingEdgeIds: string[];
}

export interface InfluenceHubsFinding extends HeuristicFinding {
  kind: "influence_hubs_v1";
  results: InfluenceHubResult[];
}
