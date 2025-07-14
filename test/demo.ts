import { ZetoSearch } from "../src";
import mockData from "./mock_data.json";

const engine = new ZetoSearch({
  searchFields: ["first_name", "last_name"],
  resultFields: ["id", "first_name", "last_name", "email", "age"]
});

engine.indexDocuments(mockData);

console.log("🔍 Result:", engine.search("Cam", {
  filter: (doc) => doc.age > 18,
}));
// console.log("Suggestions:", engine.autoSuggest("cam"));