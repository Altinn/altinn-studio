import type { Dict, Keywords, UiSchemaNode } from './types';
import JSONPointer from 'jsonpointer';

export const assignRootIfDefined = (out: Dict, node: UiSchemaNode, keyword: Keywords) => {
  const value = node[keyword];
  if (value !== undefined) {
    JSONPointer.set(out, `/${keyword}`, value);
  }
};
