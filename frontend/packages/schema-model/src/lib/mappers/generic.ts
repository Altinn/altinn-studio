import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { Keyword } from '../../types';
import { makePointerFromArray } from '../pointerUtils';

export const genericKeywords: Keyword[] = [
  Keyword.Default,
  Keyword.Enum,
  Keyword.Const,
  Keyword.Title,
  Keyword.Description,
];

export const findGenericKeywordsOnNode = (schemaNode: KeyValuePairs) => {
  const out: { [key: string]: any } = {};
  genericKeywords.forEach((keyword) => (out[keyword] = schemaNode[keyword]));
  return out;
};

export const findReference = (ref?: string) =>
  ref
    ? ref.replace(
        makePointerFromArray([Keyword.DeprecatedDefinitions]),
        makePointerFromArray([Keyword.Definitions]),
      )
    : undefined;
