import { ZetoSearch } from "../src";
import mockData from "./mock_data.json";

const search = new ZetoSearch({
  searchFields: ['title', 'content', 'tags'],
  resultFields: ['id', 'title', 'content', 'author', 'date'],
  // stopWords: ['the', 'is', 'and', 'a', 'an', 'to', 'for'],
  // fuzzyFactor: 0.15,
  // minTokenLength: 2,
  // maxTokenLength: 50,   
  // enableStemming: true,    // "running" matches "run", "runs"
  // caseSensitive: false 
});

search.indexDocuments(mockData);

// const results = search.search("javascript");
// const results = search.search('"javaScript programming"');

// const results = search.search("programming", {
//   filter: (doc) => {
//     return doc.author === "John Doe" &&
//       doc.date >= "2024-01-01";
//   }
// });

// console.log("🔍 Result: \n", results);

// Get suggestions as user types
function getSuggestions(partialQuery: string) {
  return search.autoSuggest(partialQuery, {
    limit: 8,
    fuzzyFactor: 0.3
  });
}

// Usage
const suggestions = getSuggestions("java");
console.log(suggestions); // ["javascript", "java"]