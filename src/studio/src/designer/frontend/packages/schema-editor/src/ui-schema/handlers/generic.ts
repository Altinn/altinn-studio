import { JsonSchemaNode, Keywords } from '../types';

export const genericKeywords = [
  Keywords.Default,
  Keywords.Enum,
  Keywords.Const,
  Keywords.Title,
  Keywords.Description,
];

export const handleGenericKeywords = (schemaNode: JsonSchemaNode) => {
  const out: { [key: string]: any } = {};
  genericKeywords.forEach((keyword) => {
    out[keyword] = schemaNode[keyword];
  });
  return out;
};
