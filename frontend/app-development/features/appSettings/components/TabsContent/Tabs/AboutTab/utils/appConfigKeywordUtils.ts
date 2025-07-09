import type { Keyword } from 'app-shared/types/AppConfig';

export function mapKeywordsArrayToString(keywords: Keyword[]): string {
  return keywords.map((keyword: Keyword) => keyword.word).join(', ');
}

export function mapStringToKeywords(keywordsString: string): Keyword[] {
  const commaSeparatedKeywords: string[] = splitCommaSeparatedString(keywordsString);
  const keywordStrings: string[] = removeFalsyKeywords(commaSeparatedKeywords);
  const keywords: Keyword[] = mapStringListToKeywords(keywordStrings);

  return keywords;
}

function splitCommaSeparatedString(commaSeparatedString: string): string[] {
  return commaSeparatedString.split(',');
}

function removeFalsyKeywords(keywordStrings: string[]): string[] {
  return keywordStrings.filter(Boolean);
}

function mapStringListToKeywords(keywordString: string[]): Keyword[] {
  return keywordString.map((word: string) => ({ language: 'nb', word: word.trim() }));
}
