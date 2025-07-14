export interface ZetoSearchOptions {
  searchFields: string[];
  resultFields: string[];
  stopWords?: string[];
  fuzzyFactor?: number;
}

export interface SearchOptions {
  fields?: string[];
  fuzzyFactor?: number;
  filter?: (doc: any) => boolean;
  sort?: SortOptions;
  limit?: number;
  offset?: number;
}

export interface SortOptions {
  by: string;
  order?: "asc" | "desc";
}

export interface ZetoSearchResult {
  [key: string]: string | number | boolean;
  score: number;
}

export interface ZetoSearchResponse {
  results: ZetoSearchResult[];
  total: number;
}

export interface Posting {
  tf: number;
  positions: number[];
}

export interface IndexEntry {
  df: number;
  postings: Record<string | number, Posting>;
}
