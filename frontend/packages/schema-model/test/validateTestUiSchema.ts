import { FieldType, ObjectKind, ROOT_POINTER, UiSchemaNodes } from '../src';
import { getPointers } from '../src/lib/mappers/getPointers';
import { areItemsUnique, mapByKey, removeItemByValue } from 'app-shared/utils/arrayUtils';
import {
  isField,
  isFieldOrCombination,
  isReference,
  isObject,
  isArray,
  isCombination,
  isNotTheRootNode,
  isTheRootNode,
} from '../src/lib/utils';

/** Verifies that there is a root node */
export const hasRootNode = (uiSchema: UiSchemaNodes) =>
  expect(getPointers(uiSchema)).toContain(ROOT_POINTER);

/** Verifies that all pointers are unique */
export const pointersAreUnique = (uiSchema: UiSchemaNodes) =>
  expect(areItemsUnique(getPointers(uiSchema))).toBe(true);

/** Verifies that all pointers referenced to as children exist */
export const allPointersExist = (uiSchema: UiSchemaNodes) => {
  uiSchema.filter(isFieldOrCombination).forEach(({ children }) => {
    children.forEach((childPointer) => {
      expect(getPointers(uiSchema)).toContain(childPointer);
    });
  });
};

/** Verifies that all nodes except the root node have a parent */
export const nodesHaveParent = (uiSchema: UiSchemaNodes) => {
  const allChildPointers = mapByKey(uiSchema.filter(isFieldOrCombination), 'children').flat();
  removeItemByValue(getPointers(uiSchema), ROOT_POINTER).forEach((pointer) => {
    expect(allChildPointers).toContain(pointer);
  });
};

/** Verifies that all referenced nodes exist */
export const referencedNodesExist = (uiSchema: UiSchemaNodes) => {
  const allReferenceNodes = uiSchema.filter(isReference);
  allReferenceNodes.forEach(({ reference }) => {
    expect(getPointers(uiSchema)).toContain(reference);
  });
};

/** Verifies that all child pointers start with the parent pointer */
export const childPointersStartWithParentPointer = (uiSchema: UiSchemaNodes) => {
  uiSchema.filter(isFieldOrCombination).forEach(({ pointer, children }) => {
    children.forEach((childPointer) => {
      expect(childPointer.startsWith(pointer + '/')).toBe(true);
    });
  });
};

/** Verifies that all child pointers of objects have the "properties" prefix */
export const childPointersOfObjectsHavePropertyPointer = (uiSchema: UiSchemaNodes) => {
  uiSchema
    .filter(isField)
    .filter((node) => isObject(node) && !isArray(node))
    .filter(isNotTheRootNode)
    .forEach(({ pointer, children }) => {
      children.forEach((childPointer) => {
        expect(childPointer.startsWith(pointer + '/properties/')).toBe(true);
      });
    });
};

/** Verifies that the root node is an object */
export const rootNodeIsObjectOrCombination = (uiSchema: UiSchemaNodes) => {
  const rootNode = uiSchema.find(isTheRootNode);
  expect(rootNode).toBeDefined();
  if (isField(rootNode)) {
    expect(rootNode.fieldType).toBe(FieldType.Object);
  } else {
    expect(rootNode.objectKind).toBe(ObjectKind.Combination);
  }
};

/* Verifies that all child pointers of arrays have the "items" prefix */
export const childPointersOfArraysHaveItemsPointer = (uiSchema: UiSchemaNodes) => {
  uiSchema
    .filter(isFieldOrCombination)
    .filter(isArray)
    .forEach(({ pointer, children }) => {
      children.forEach((childPointer) => {
        expect(childPointer.startsWith(pointer + '/items/')).toBe(true);
      });
    });
};

/** Verifies that all child pointers of combinations have the correct combination prefix */
export const childPointerOfCombinationsHaveCombinationPointer = (uiSchema: UiSchemaNodes) => {
  uiSchema
    .filter(isCombination)
    .filter(isNotTheRootNode)
    .forEach(({ pointer, children, combinationType, isArray }) => {
      const base = isArray ? `${pointer}/items` : pointer;
      children.forEach((childPointer) => {
        expect(childPointer.startsWith(base + '/' + combinationType + '/')).toBe(true);
      });
    });
};

/**
 * Runs all the functions above.
 * @param uiSchema The schema to validate.
 * @returns void
 */
export const validateTestUiSchema = (uiSchema: UiSchemaNodes) => {
  hasRootNode(uiSchema);
  pointersAreUnique(uiSchema);
  allPointersExist(uiSchema);
  nodesHaveParent(uiSchema);
  referencedNodesExist(uiSchema);
  childPointersStartWithParentPointer(uiSchema);
  childPointersOfObjectsHavePropertyPointer(uiSchema);
  childPointersOfArraysHaveItemsPointer(uiSchema);
  childPointerOfCombinationsHaveCombinationPointer(uiSchema);
  rootNodeIsObjectOrCombination(uiSchema);
};

export const testSchemaNodes = (schemaNodes: UiSchemaNodes) => {
  it('Has a root node', () => hasRootNode(schemaNodes));
  test('All node pointers are unique', () => pointersAreUnique(schemaNodes));
  test('All child pointers exist in the list', () => allPointersExist(schemaNodes));
  test('All nodes except the root node have a parent', () => nodesHaveParent(schemaNodes));
  test('All referenced nodes exist', () => referencedNodesExist(schemaNodes));
  test('All child pointers start with the parent pointer', () =>
    childPointersStartWithParentPointer(schemaNodes));
  test('All child pointers of objects have a property pointer', () =>
    childPointersOfObjectsHavePropertyPointer(schemaNodes));
  test('Child pointers of arrays have an items pointer', () =>
    childPointersOfArraysHaveItemsPointer(schemaNodes));
  test('All child pointers of combinations have the correct combination pointer', () =>
    childPointerOfCombinationsHaveCombinationPointer(schemaNodes));
  test('The root node is an object', () => rootNodeIsObjectOrCombination(schemaNodes));
};
