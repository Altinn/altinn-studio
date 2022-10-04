import type { JsonSchemaNode } from '../types';
import { Keywords } from '../types';

export const genericKeywords = [Keywords.Default, Keywords.Enum, Keywords.Const, Keywords.Title, Keywords.Description];

export const findGenericKeywordsOnNode = (schemaNode: JsonSchemaNode) => {
  const out: { [key: string]: any } = {};
  genericKeywords.forEach((keyword) => (out[keyword] = schemaNode[keyword]));
  return out;
};
