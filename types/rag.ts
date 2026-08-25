export interface VehicleDocument {
  id: string;
  source: string;
  url?: string;
  vehicle?: {
    brand?: string;
    model?: string;
    version?: string;
    year?: number;
  };
  content: string;
  metadata: Record<string, unknown>;
  timestamp: string;
  kind: "static" | "dynamic";
  isDemo: boolean;
}

export interface RetrievalQuery {
  text: string;
  vehicle?: {
    brand?: string;
    model?: string;
    version?: string;
    year?: number;
    fuel?: string;
    engineCode?: string;
    gearboxCode?: string;
    /** Normalized motor/gearbox codes for metadata boost. */
    componentCodes?: string[];
  };
  limit?: number;
}

export interface RetrievedDocument {
  document: VehicleDocument;
  score: number;
}

export interface DocumentIndex {
  upsert(documents: VehicleDocument[]): Promise<void>;
  query(input: RetrievalQuery): Promise<RetrievedDocument[]>;
}
