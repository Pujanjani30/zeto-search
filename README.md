# ZetoSearch

A **lightweight full-text search library** for Node.js written in TypeScript — supporting **multi-field indexing**, **TF-IDF / BM25 ranking**, **fuzzy matching**, and **auto-suggest**.  
Perfect for building fast, offline, or local search features without Elasticsearch or external dependencies.

---

## 🚀 Features

- 🔍 **Full-text search** across multiple fields  
- 📊 **TF-IDF + BM25 ranking** for relevance-based results  
- ✨ **Fuzzy search** with similarity scoring  
- ⚡ **Auto-suggest** for predictive typing  
- 🧩 **Custom filters, sorting, and pagination**  
- 📘 Written in **TypeScript** with type definitions  
- 🪶 Lightweight and dependency-free (only uses `natural` for NLP)

---

## 📦 Installation

```bash
npm install zetosearch
```

---

## 🧩 Quick Start

### 1️. Import and Initialize

```ts
import { ZetoSearch } from "zetosearch";

const searchEngine = new ZetoSearch({
  searchFields: ["title", "content"],
  resultFields: ["id", "title", "content"],
});
```

---

### 2️. Index Documents

```ts
searchEngine.indexDocuments([
  { id: 1, title: "JavaScript Basics", content: "Learn programming with JS" },
  { id: 2, title: "Node.js Advanced", content: "Explore backend development" },
  { id: 3, title: "TypeScript Guide", content: "Strong typing for JavaScript" },
]);
```

---

### 3️. Search

```ts
const results = searchEngine.search("javascript", {
  fuzzyFactor: 0.2,
  limit: 5,
  debug: true,
});

console.log(results);
```

**Output Example:**
```json
{
  "results": [
    { "id": 1, "title": "JavaScript Basics", "content": "Learn programming with JS", "score": 2.341 },
    { "id": 3, "title": "TypeScript Guide", "content": "Strong typing for JavaScript", "score": 1.126 }
  ],
  "total": 2,
  "totalResults": 2,
  "query": "javascript",
  "searchTime": 2
}
```

---

## 💡 Auto-Suggest Example

```ts
const suggestions = searchEngine.autoSuggest("jav");
console.log(suggestions);
```

**Output:**
```
["javascript", "java", "js"]
```

---

## ⚙️ Options

### ZetoSearch Options

| Option | Type | Default | Description |
|---------|------|----------|-------------|
| `searchFields` | `string[]` | *Required* | Fields to index for search |
| `resultFields` | `string[]` | *Required* | Fields to return in results |
| `stopWords` | `string[]` | Common English stop words | Tokens to ignore |
| `fuzzyFactor` | `number` | `0.1` | Controls fuzziness (0–1) |
| `caseSensitive` | `boolean` | `false` | Enable case-sensitive search |
| `minTokenLength` | `number` | `1` | Minimum token length |
| `maxTokenLength` | `number` | `50` | Maximum token length |
| `enableStemming` | `boolean` | `false` | Use Porter stemmer |

---

### Search Options

| Option | Type | Default | Description |
|---------|------|----------|-------------|
| `fields` | `string[]` | All search fields | Limit search to specific fields |
| `fuzzyFactor` | `number` | Inherited from options | Override fuzziness per search |
| `filter` | `(doc) => boolean` | None | Custom document filtering |
| `sort` | `{ by: string, order?: "asc" \| "desc" }` | `{ by: "score", order: "desc" }` | Sorting options |
| `limit` | `number` | `10` | Number of results |
| `offset` | `number` | `0` | Pagination offset |
| `debug` | `boolean` | `false` | Include debug info in response |

---

## 📊 Utility Methods

### Get Stats
```ts
console.log(searchEngine.getStats());
```

**Output:**
```json
{
  "totalDocuments": 3,
  "totalTokens": 42,
  "avgDocLength": 14,
  "indexSize": 5321,
  "fieldsIndexed": ["title", "content"]
}
```

---

## 🧾 License
**ISC License**

© 2025 [Pujan Jani](https://github.com/pujanjani30)  
Open source and free to use for personal or commercial projects.

---
