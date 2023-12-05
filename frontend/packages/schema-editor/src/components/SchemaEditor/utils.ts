import {ItemPosition} from 'app-shared/types/dndTypes';
import {ROOT_POINTER, SchemaModel, UiSchemaNode} from '../../../../schema-model';

// This is necessary because the root node's children list contains both properties and definitions, but only properties are visible in the tree.
// TODO: Remove this function when properties and definitions are in separate lists: https://github.com/Altinn/altinn-studio/issues/11824
export const calculatePositionInFullList = (schemaModel: SchemaModel, positionInPropertyList: ItemPosition): number => {
  if (positionInPropertyList.parentId !== ROOT_POINTER) return positionInPropertyList.index;
  if (positionInPropertyList.index === 0) return 0;
  const allRootNodes = schemaModel.getRootChildren();
  const rootProperties = schemaModel.getRootProperties();
  const propertyAtGivenIndexPointer = rootProperties[positionInPropertyList.index].pointer;
  const isPropertyAtGivenIndex = (node: UiSchemaNode) => node.pointer === propertyAtGivenIndexPointer;
  return allRootNodes.findIndex(isPropertyAtGivenIndex);
};
