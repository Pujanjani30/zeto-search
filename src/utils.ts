import { IndexEntry, ZetoSearchResult } from "./types";

export function tfIdf(
  termKey: string,
  docId: number | string,
  index: Record<string, IndexEntry>,
  totalDocs: number
): number {
  const entry = index[termKey];
  const posting = entry?.postings[docId];
  if (!posting) return 0;

  const tf = posting.tf;
  const idf = Math.log((totalDocs + 1) / (entry.df + 1)) + 1;
  return tf * idf;
}


export function sortResults(
  a: ZetoSearchResult,
  b: ZetoSearchResult,
  sort: { by: string; order?: "asc" | "desc" }
) {
  const valA = a[sort.by];
  const valB = b[sort.by];

  // Null or undefined check
  if (valA == null && valB != null) return sort?.order === 'asc' ? -1 : 1;
  if (valB == null && valA != null) return sort?.order === 'asc' ? 1 : -1;
  if (valA == null && valB == null) return 0;

  // For sorting by score
  if (sort.by === "score") {
    const numA = valA as number;
    const numB = valB as number;
    return sort?.order === 'asc' ? numA - numB : numB - numA;
  }

  // For sorting by numeric fields
  if (typeof valA === 'number' && typeof valB === 'number') {
    return sort?.order === 'asc' ? valA - valB : valB - valA;
  }

  // For sorting by string fields
  if (typeof valA === 'string' && typeof valB === 'string') {
    const lowerA = valA.toLowerCase();
    const lowerB = valB.toLowerCase();
    return sort?.order === 'asc'
      ? lowerA.localeCompare(lowerB)
      : lowerB.localeCompare(lowerA);
  }

  return 0;
}