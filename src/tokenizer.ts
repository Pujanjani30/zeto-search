import * as natural from "natural";

export class Tokenizer {
  private wordTokenizer: any;
  private stemmer: any;

  constructor() {
    this.wordTokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
  }

  tokenize(
    text: string,
    options: {
      stem?: boolean;
      minLength?: number;
      maxLength?: number;
    } = {}
  ): string[] {
    if (!text || typeof text !== 'string') return [];

    const tokens = this.wordTokenizer.tokenize(text.toLowerCase());
    if (!tokens) return [];

    return tokens
      .filter((token: string) => {
        if (!token || token.length === 0) return false;
        if (options.minLength && token.length < options.minLength) return false;
        if (options.maxLength && token.length > options.maxLength) return false;
        return true;
      })
      .map((token: string) => (options.stem ? this.stemmer.stem(token) : token));
  }

  getDistance(a: string, b: string): number {
    return natural.DamerauLevenshteinDistance(a, b);
  }
}

export const tokenizer = new Tokenizer();
export const getDistance = (a: string, b: string) => tokenizer.getDistance(a, b);