import type { ItemPosition } from 'app-shared/types/dndTypes';
import type { SchemaModel, UiSchemaNode } from '@altinn/schema-model';
import { ROOT_POINTER } from '@altinn/schema-model';
import { NumberUtils } from '@studio/pure-functions';
import type { Interval } from '@studio/pure-functions';

// This is necessary because the root node's children list contains both properties and definitions, but only properties are visible in the tree.
// TODO: Remove this function when properties and definitions are in separate lists: https://github.com/Altinn/altinn-studio/issues/11824
export const calculatePositionInFullList = (
  schemaModel: SchemaModel,
  positionInPropertyList: ItemPosition,
): number => {
  if (positionInPropertyList.parentId !== ROOT_POINTER) return positionInPropertyList.index;
  const allRootNodes = schemaModel.getRootChildren();
  const rootProperties = schemaModel.getRootProperties();
  const openInterval: Interval = { min: -1, max: rootProperties.length };
  if (!NumberUtils.isWithinOpenInterval(positionInPropertyList.index, openInterval)) return -1;
  const propertyAtGivenIndexPointer = rootProperties[positionInPropertyList.index].pointer;
  const isPropertyAtGivenIndex = (node: UiSchemaNode) =>
    node.pointer === propertyAtGivenIndexPointer;
  return allRootNodes.findIndex(isPropertyAtGivenIndex);
};
