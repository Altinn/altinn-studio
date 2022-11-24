import type { Dict } from '../types';
import { Keywords } from '../types';
import { makePointer } from '../utils';

export const genericKeywords = [
  Keywords.Default,
  Keywords.Enum,
  Keywords.Const,
  Keywords.Title,
  Keywords.Description,
];

export const findGenericKeywordsOnNode = (schemaNode: Dict) => {
  const out: { [key: string]: any } = {};
  genericKeywords.forEach((keyword) => (out[keyword] = schemaNode[keyword]));
  return out;
};

export const findReference = (ref?: string) =>
  ref
    ? ref.replace(makePointer(Keywords.DeprecatedDefinitions), makePointer(Keywords.Definitions))
    : undefined;
