export interface ZetoSearchOptions {
  searchFields: string[];
  resultFields: string[];
  stopWords?: string[];
  fuzzyFactor?: number;
  minTokenLength?: number;
  maxTokenLength?: number;
  enableStemming?: boolean;
  idAlias?: string;
}

export interface SearchOptions {
  fields?: string[];
  fuzzyFactor?: number;
  filter?: (doc: any) => boolean;
  sort?: SortOptions;
  limit?: number;
  offset?: number;
  debug?: boolean;
}

export interface SortOptions {
  by: string;
  order?: "asc" | "desc";
}

export interface ZetoSearchResult {
  [key: string]: any;
  score: number;
}

export interface ZetoSearchResponse {
  results: ZetoSearchResult[];
  total: number;
  totalResults: number;
  query: string;
  searchTime?: number;
  debug?: DebugInfo;
  error?: string;
}

export interface DebugInfo {
  processedTokens: string[];
  indexKeysMatched: number;
  documentsScored: number;
  averageScore: number;
}

export interface Posting {
  tf: number;
  positions: number[];
}

export interface IndexEntry {
  df: number;
  postings: Record<string | number, Posting>;
}
