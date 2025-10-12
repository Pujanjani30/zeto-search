import { ZetoSearchOptions, ZetoSearchResponse, ZetoSearchResult, IndexEntry, SearchOptions, DebugInfo } from "./types";
import { getDistance, Tokenizer } from "./tokenizer";
import { sortResults, bm25Score, calculateSimilarity, stopwords } from "./utils";

export class ZetoSearch<T extends Record<string, any> = any> {
   // Index structure: { "field:token": { df, postings: { docId: { tf, positions } } } }
   private index: Record<string, IndexEntry> = {};
   private documents: T[] = [];
   private documentMap: Map<string | number, T> = new Map();
   private docsCount: number = 0;
   private searchFields: string[] = [];
   private resultFields: string[] = [];
   private stopWords: Set<string> = new Set();
   private options: ZetoSearchOptions;
   private avgDocLength: number = 0;
   private docLengths: Map<string | number, number> = new Map();
   private tokenizer: Tokenizer;

   constructor(options: ZetoSearchOptions) {
      this.validateOptions(options);
      this.tokenizer = new Tokenizer();
      this.options = {
         fuzzyFactor: 0.1,
         caseSensitive: false,
         minTokenLength: 1,
         maxTokenLength: 50,
         enableStemming: false,
         ...options
      }
      this.searchFields = options.searchFields;
      this.resultFields = options.resultFields;
      this.stopWords = new Set(options.stopWords || stopwords);
   }

   private validateOptions(options: ZetoSearchOptions): void {
      if (!options.searchFields || !Array.isArray(options.searchFields) || options.searchFields.length === 0) {
         throw new Error("searchFields is required and must be a non-empty array");
      }
      if (!options.resultFields || !Array.isArray(options.resultFields) || options.resultFields.length === 0) {
         throw new Error("resultFields is required and must be a non-empty array");
      }
   }

   indexDocuments(docs: T[]): void {
      if (!Array.isArray(docs))
         throw new Error("Documents must be an array");

      // Clear existing data
      this.index = {};
      this.documents = [];
      this.documentMap.clear();
      this.docsCount = 0;
      this.docLengths.clear();

      docs.forEach(doc => {
         if (this.validateDocument(doc)) {
            this.indexDocument(doc);
         }
      });

      this.calculateAverageDocLength();
   }

   private validateDocument(doc: T): boolean {
      if (!doc || typeof doc !== 'object') {
         console.warn('Invalid document: must be an object');
         return false;
      }

      if (doc.id === undefined || doc.id === null) {
         console.warn('Document missing required id field');
         return false;
      }

      return true;
   }

   // Indexing - this method processes each document and updates the index
   indexDocument(doc: T): void {
      if (!this.validateDocument(doc)) return;

      const docId = String(doc.id);
      this.documents.push(doc);
      this.documentMap.set(docId, doc);
      this.docsCount++;

      let totalTokens = 0;

      for (const field of this.searchFields) {
         const value = doc[field];
         if (!value) continue;

         const content = String(value);
         const tokens = this.tokenizer.tokenize(content, {
            stem: this.options.enableStemming,
            minLength: this.options.minTokenLength,
            maxLength: this.options.maxTokenLength
         });

         totalTokens += tokens.length;

         tokens.forEach((token, pos) => {
            if (!token || token.length === 0) return;
            if (this.stopWords.has(token)) return;

            const key = `${field}:${token}`;

            // Update main index
            if (!this.index[key]) {
               this.index[key] = { df: 0, postings: {} };
            }

            const mainIndexEntry = this.index[key];

            // Check if the document ID already exists in postings
            if (!mainIndexEntry.postings[docId]) {
               mainIndexEntry.postings[docId] = { tf: 0, positions: [] };
               mainIndexEntry.df++;
            }

            const posting = mainIndexEntry.postings[docId];
            posting.tf++;
            posting.positions.push(pos);
         });
      }

      this.docLengths.set(docId, totalTokens);
   }

   private calculateAverageDocLength(): void {
      const totalLength = Array.from(this.docLengths.values()).reduce((sum, len) => sum + len, 0);
      this.avgDocLength = this.docsCount > 0 ? totalLength / this.docsCount : 0;
   }

   search(
      query: string,
      options: SearchOptions = {}
   ): ZetoSearchResponse {
      const startTime = Date.now();

      try {
         // Validate and normalize query
         if (!query || typeof query !== 'string' || query.trim() === "") {
            return {
               results: [],
               total: 0,
               totalResults: 0,
               query: query || "",
               searchTime: Date.now() - startTime
            };
         }

         const normalizedQuery = query.trim();
         const fields = options.fields || this.searchFields;
         const fuzzyFactor = options.fuzzyFactor ?? this.options.fuzzyFactor!;
         const filter = options.filter || (() => true);
         const sort = options.sort || { by: "score", order: "desc" };
         const limit = Math.max(1, options.limit || 10);
         const offset = Math.max(0, options.offset || 0);

         const searchQuery = normalizedQuery;

         const tokens = this.tokenizer.tokenize(searchQuery, {
            stem: this.options.enableStemming,
            minLength: this.options.minTokenLength,
            maxLength: this.options.maxTokenLength
         });

         const filteredTokens = tokens.filter(t => !this.stopWords.has(t));

         if (filteredTokens.length === 0) {
            return {
               results: [],
               total: 0,
               totalResults: 0,
               query: normalizedQuery,
               searchTime: Date.now() - startTime
            };
         }

         const scores: Map<string | number, number> = new Map();
         const debugInfo: DebugInfo = {
            processedTokens: filteredTokens,
            indexKeysMatched: 0,
            documentsScored: 0,
            averageScore: 0,
         };

         // Search logic
         this.searchTokens(filteredTokens, fields, fuzzyFactor, scores, debugInfo);

         // Filter and prepare results
         const candidateResults: ZetoSearchResult[] = [];
         let totalScored = 0;

         for (const [docId, score] of scores) {
            if (score <= 0) continue;

            const doc = this.documentMap.get(docId);
            if (!doc || !filter(doc)) continue;

            totalScored++;
            const result = this.createSearchResult(doc, score);
            candidateResults.push(result);
         }

         // Sort all results
         candidateResults.sort((a, b) => sortResults(a, b, sort));

         // Apply pagination
         const paginatedResults = candidateResults.slice(offset, offset + limit);
         debugInfo.documentsScored = totalScored;
         debugInfo.averageScore = totalScored > 0
            ? Array.from(scores.values()).reduce((sum, score) => sum + score, 0) / totalScored
            : 0;

         return {
            results: paginatedResults,
            total: paginatedResults.length,
            totalResults: totalScored,
            query: normalizedQuery,
            searchTime: Date.now() - startTime,
            ...(options.debug && { debug: debugInfo })
         };
      } catch (error: any) {
         return {
            results: [],
            total: 0,
            totalResults: 0,
            query: query || "",
            searchTime: Date.now() - startTime,
            error: `Search failed: ${error.message}`
         };
      }
   }

   private searchTokens(
      tokens: string[],
      fields: string[],
      fuzzyFactor: number,
      scores: Map<string | number, number>,
      debugInfo: DebugInfo
   ): void {
      for (const term of tokens) {
         for (const field of fields) {
            const termKey = `${field}:${term}`;

            // Exact matches first
            if (this.index[termKey]) {
               const entry = this.index[termKey];
               this.scoreDocuments(entry, termKey, 1.0, scores);
               debugInfo.indexKeysMatched++;
            }

            // Fuzzy matches
            const maxDistance = Math.round(term.length * fuzzyFactor);
            if (maxDistance > 0) {
               for (const key in this.index) {
                  if (key.startsWith(`${field}:`)) {
                     const token = key.substring(field.length + 1);
                     if (token === term) continue; // Already processed

                     const similarity = calculateSimilarity(term, token);
                     const distance = getDistance(term, token);

                     if (distance <= maxDistance && similarity > 0.3) {
                        this.scoreDocuments(this.index[key], key, similarity * 0.8, scores);
                        debugInfo.indexKeysMatched++;
                     }
                  }
               }
            }
         }
      }
   }

   private scoreDocuments(
      entry: IndexEntry,
      termKey: string,
      similarity: number,
      scores: Map<string | number, number>
   ): void {
      for (const docId in entry.postings) {
         const docLength = this.docLengths.get(docId) || this.avgDocLength;
         const bm25 = bm25Score(termKey, docId, this.index, this.docsCount, this.avgDocLength, docLength);
         const weightedScore = Math.max(0.1, bm25 * similarity); // Ensure minimum score

         const currentScore = scores.get(docId) || 0;
         scores.set(docId, currentScore + weightedScore);
      }
   }

   private createSearchResult(
      doc: T,
      score: number,
   ): ZetoSearchResult {
      const result: ZetoSearchResult = {
         score: parseFloat(score.toFixed(4))
      };

      // Add result fields
      for (const field of this.resultFields) {
         result[field] = doc[field];
      }
      return result;
   }

   // Auto-suggest implementation
   autoSuggest(query: string, options: { limit?: number; fuzzyFactor?: number } = {}): string[] {
      const limit = options.limit || 5;
      const fuzzyFactor = options.fuzzyFactor || 0.2;

      if (!query || query.trim() === "") return [];

      const tokens = this.tokenizer.tokenize(query.toLowerCase());
      if (!tokens.length) return [];
      const lastToken = tokens[tokens.length - 1];
      const suggestions = new Map<string, number>();

      // Collect suggestions from all field indexes
      for (const key in this.index) {
         const token = key.substring(key.indexOf(':') + 1);
         const similarity = calculateSimilarity(lastToken, token);
         const distance = getDistance(lastToken, token);
         const maxDistance = Math.round(lastToken.length * fuzzyFactor);

         if (token.startsWith(lastToken) || distance <= maxDistance) {
            const entry = this.index[key];
            const score = entry.df * (similarity + (token.startsWith(lastToken) ? 0.5 : 0));
            const currentScore = suggestions.get(token) || 0;
            suggestions.set(token, Math.max(currentScore, score));
         }
      }

      return Array.from(suggestions.entries())
         .sort((a, b) => b[1] - a[1])
         .slice(0, limit)
         .map(([token]) => token);
   }

   // Statistics and debugging
   getStats(): {
      totalDocuments: number;
      totalTokens: number;
      avgDocLength: number;
      indexSize: number;
      fieldsIndexed: string[];
   } {
      return {
         totalDocuments: this.docsCount,
         totalTokens: Object.keys(this.index).length,
         avgDocLength: this.avgDocLength,
         indexSize: JSON.stringify(this.index).length,
         fieldsIndexed: this.searchFields
      };
   }
}

export default ZetoSearch;
