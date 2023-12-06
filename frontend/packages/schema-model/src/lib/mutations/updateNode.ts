import { UiSchemaNode, UiSchemaNodes } from '../../types';
import { replaceByPredicate } from 'app-shared/utils/arrayUtils';

export const updateNode = (
  uiSchemaNodes: UiSchemaNodes,
  pointer: string,
  updatedNode: UiSchemaNode,
): UiSchemaNodes =>
  replaceByPredicate(uiSchemaNodes, (node) => node.pointer === pointer, updatedNode);
