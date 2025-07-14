import { ZetoSearchOptions, ZetoSearchResponse, ZetoSearchResult, IndexEntry, SearchOptions } from "./types";
import { tokenizer, getDistance } from "./tokenizer";
import { sortResults, tfIdf } from "./utils";

export class ZetoSearch {
   // Index structure: { "field:token": { df, postings: { docId: { tf, positions } } } }
   private index: Record<string | number, IndexEntry> = {};
   private documents: any[] = [];
   private docsCount: number = 0;
   private searchFields: string[] = [];
   private resultFields: string[] = [];
   private stopWords: Set<string> = new Set();
   private fuzzyFactor: number = 0.1;

   constructor(options: ZetoSearchOptions) {
      this.searchFields = options.searchFields;
      this.resultFields = options.resultFields;
      this.stopWords = new Set(options.stopWords || ["the", "is", "and", "a", "an"]);
   }

   indexDocuments(docs: any[]) {
      docs.forEach(doc => this.indexDocument(doc));
   }

   // Indexing - this method processes each document and updates the index
   indexDocument(doc: any) {
      this.documents.push(doc);
      this.docsCount++;

      for (const field of this.searchFields) {
         const value = (doc[field] || "").toLowerCase();
         // Tokenize the field value
         const tokens = tokenizer.tokenize(value);

         tokens?.forEach((token, pos) => {
            // Skip empty tokens and stop words
            if (!token || token.length === 0) return;
            if (this.stopWords.has(token)) return;

            // Create a unique key for the token in the field
            const key = `${field}:${token}`;

            // Check if the index entry exists
            if (!this.index[key]) {
               // If not, initialize the index entry for this token
               this.index[key] = { df: 0, postings: {} };
            }

            const entry = this.index[key];

            // Check if the document ID already exists in postings
            if (!entry.postings[doc.id]) {
               // Initialize the posting for this document
               entry.postings[doc.id] = { tf: 0, positions: [] };
               entry.df++;
            }

            const posting = entry.postings[doc.id];
            // Increment term frequency
            posting.tf++;
            // Add the position of the token in the document
            posting.positions.push(pos);
         });
      }
   }

   search(
      query: string,
      options: SearchOptions = {}
   ): ZetoSearchResponse {

      const fields = options.fields || this.searchFields;
      const fuzzyFactor = options.fuzzyFactor || this.fuzzyFactor;
      const filter = options.filter || (() => true);
      const sort = options.sort || { by: "score", order: "desc" };
      const limit = options.limit || 10;
      const offset = options.offset || 0;

      if (!query || query.trim() === "") {
         return {
            results: [],
            total: 0
         }
      }

      const rawTokens = tokenizer.tokenize(query.toLowerCase());
      const tokens: string[] = Array.isArray(rawTokens) ? rawTokens : [];

      const filteredTokens = tokens.filter((t: string) => {
         return !(this.stopWords?.has?.(t));  // optional chaining ensures safety
      });

      const scores: { [docId: number]: number } = {};

      for (const term of filteredTokens) {
         for (const field of fields) {
            // Loop through all index keys to find fuzzy or partial matches
            for (const indexKey in this.index) {
               if (!indexKey.startsWith(`${field}:`)) continue;

               const token = indexKey.split(":")[1];
               const distance = getDistance(term, token);
               const maxDistance = Math.round(term.length * fuzzyFactor);
               const isSubstring = token.includes(term);

               // Match based on distance or prefix
               if (distance <= maxDistance || isSubstring) {
                  const entry = this.index[indexKey];
                  if (!entry) continue;

                  let similarity = 0;

                  if (distance <= maxDistance) {
                     similarity = 1 - distance / Math.max(maxDistance, 1);
                  } else if (isSubstring) {
                     similarity = 1 - term.length / token.length;
                  }

                  // Clamp minimum to avoid zeroing useful matches
                  similarity = Math.max(similarity, 0.05);

                  for (const docId in entry.postings) {
                     const id = parseInt(docId);
                     const tfidfScore = tfIdf(indexKey, id, this.index, this.docsCount);

                     // Multiply tfIdf by similarity to weigh by how close the token is to term
                     const weightedScore = tfidfScore * similarity;

                     scores[id] = (scores[id] || 0) + weightedScore;

                     // console.log(`token=${token}, term=${term}, distance=${distance}, sim=${similarity.toFixed(3)}, tfidf=${tfidfScore.toFixed(3)}, weighted=${weightedScore.toFixed(3)}`);
                  }
               }
            }
         }
      }

      const docMap = new Map(this.documents.map(doc => [doc.id, doc]));

      const results: ZetoSearchResult[] = Object.entries(scores)
         .filter(([docId, score]) => {
            const doc = docMap.get(parseInt(docId));
            if (score <= 0) return false;
            return doc && (!filter || filter(doc))
         })
         .map(([docId, score]) => {
            const doc = docMap.get(parseInt(docId));
            const selectedFields: Record<string, any> = {};

            for (const field of this.resultFields) {
               selectedFields[field] = doc[field];
            }

            return { ...selectedFields, score: parseFloat(score.toFixed(3)) };
         })
         .sort((a: ZetoSearchResult, b: ZetoSearchResult) => sortResults(a, b, sort))
         .slice(offset, offset + limit);

      return {
         results,
         total: results.length
      }

   }

   // autoSuggest(query: string, options: { fuzzyFactor?: number } = {}): string[] {
   //    const fuzzyFactor = options.fuzzyFactor || this.fuzzyFactor;

   //    const tokens = tokenizer.tokenize(query.toLowerCase());
   //    if (!tokens?.length) return [];

   //    const suggestions: Set<string> = new Set();

   // }
}