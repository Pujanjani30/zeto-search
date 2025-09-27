import { getDistance } from "./tokenizer";
import { IndexEntry, ZetoSearchResult, SortOptions } from "./types";

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

export function bm25Score(
  termKey: string,
  docId: number | string,
  index: Record<string, IndexEntry>,
  totalDocs: number,
  avgDocLength: number,
  docLength: number,
  k1: number = 1.5,
  b: number = 0.75
): number {
  const entry = index[termKey];
  const posting = entry?.postings[docId];
  if (!posting) return 0;

  const tf = posting.tf;
  const df = entry.df;
  const idf = Math.log((totalDocs - df + 0.5) / (df + 0.5));

  const numerator = tf * (k1 + 1);
  const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength));

  return idf * (numerator / denominator);
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(''));
  const setB = new Set(b.toLowerCase().split(''));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

export function calculateSimilarity(term: string, token: string): number {
  if (term === token) return 1.0;

  const editDistance = getDistance(term, token);
  const maxLength = Math.max(term.length, token.length);
  const editSim = 1 - (editDistance / maxLength);

  const jaccardSim = jaccardSimilarity(term, token);
  const substringBoost = token.includes(term) ? 0.2 : 0;
  const prefixBoost = token.startsWith(term) ? 0.1 : 0;

  return Math.max(editSim, jaccardSim) + substringBoost + prefixBoost;
}

export function sortResults(
  a: ZetoSearchResult,
  b: ZetoSearchResult,
  sort: SortOptions
): number {
  const valA = a[sort.by];
  const valB = b[sort.by];

  // Null or undefined check
  if (valA == null && valB != null) return sort?.order === 'asc' ? -1 : 1;
  if (valB == null && valA != null) return sort?.order === 'asc' ? 1 : -1;
  if (valA == null && valB == null) return 0;

  // For sorting by numeric fields
  if (typeof valA === 'number' && typeof valB === 'number') {
    return sort?.order === 'asc' ? valA - valB : valB - valA;
  }

  // For sorting by string fields
  if (typeof valA === 'string' && typeof valB === 'string') {
    const comparison = valA.toLowerCase().localeCompare(valB.toLowerCase());
    return sort?.order === 'asc' ? comparison : -comparison;
  }

  return 0;
}

export const stopwords = ["the", "is", "and", "a", "an", "as", "are", "was", "were", "been", "be", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall", "can", "to", "of", "in", "for", "on", "with", "at", "by", "from", "up", "about", "into", "through", "during", "before", "after", "above", "below", "out", "off", "over", "under", "again", "further", "then", "once"]