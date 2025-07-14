import natural = require("natural");

export const tokenizer = new natural.WordTokenizer();
export const getDistance = natural.DamerauLevenshteinDistance;
