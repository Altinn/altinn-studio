import type { UiSchemaNodes } from '../src';
import { FieldType, ObjectKind, ROOT_POINTER } from '../src';
import { getPointers } from '../src/lib/mappers/getPointers';
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
import { ArrayUtils } from '@studio/pure-functions';

/** Verifies that there is a root node */
export const hasRootNode = (uiSchema: UiSchemaNodes) =>
  expect(getPointers(uiSchema)).toContain(ROOT_POINTER);

/** Verifies that all pointers are unique */
export const pointersAreUnique = (uiSchema: UiSchemaNodes) =>
  expect(ArrayUtils.areItemsUnique(getPointers(uiSchema))).toBe(true);

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
  const allChildPointers = ArrayUtils.mapByKey(
    uiSchema.filter(isFieldOrCombination),
    'children',
  ).flat();
  ArrayUtils.removeItemByValue(getPointers(uiSchema), ROOT_POINTER).forEach((schemaPointer) => {
    expect(allChildPointers).toContain(schemaPointer);
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
  uiSchema.filter(isFieldOrCombination).forEach(({ schemaPointer, children }) => {
    children.forEach((childPointer) => {
      expect(childPointer.startsWith(schemaPointer + '/')).toBe(true);
    });
  });
};

/** Verifies that all child pointers of objects have the "properties" prefix */
export const childPointersOfObjectsHavePropertyPointer = (uiSchema: UiSchemaNodes) => {
  uiSchema
    .filter(isField)
    .filter((node) => isObject(node) && !isArray(node))
    .filter(isNotTheRootNode)
    .forEach(({ schemaPointer, children }) => {
      children.forEach((childPointer) => {
        expect(childPointer.startsWith(schemaPointer + '/properties/')).toBe(true);
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
    .forEach(({ schemaPointer, children }) => {
      children.forEach((childPointer) => {
        expect(childPointer.startsWith(schemaPointer + '/items/')).toBe(true);
      });
    });
};

/** Verifies that all child pointers of combinations have the correct combination prefix */
export const childPointerOfCombinationsHaveCombinationPointer = (uiSchema: UiSchemaNodes) => {
  uiSchema
    .filter(isCombination)
    .filter(isNotTheRootNode)
    .forEach(({ schemaPointer, children, combinationType, isArray }) => {
      const base = isArray ? `${schemaPointer}/items` : schemaPointer;
      children.forEach((childPointer) => {
        expect(childPointer.startsWith(base + '/' + combinationType + '/')).toBe(true);
      });
    });
};

/** Verifies that the names of combination children correspond to their indices */
export const combinationChildrenHaveIndexNames = (uiSchema: UiSchemaNodes) => {
  uiSchema
    .filter(isCombination)
    .filter(isNotTheRootNode)
    .forEach(({ children }) => {
      children.forEach((childPointer, index) => {
        expect(childPointer).toMatch(new RegExp(`\\/${index}$`));
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
  combinationChildrenHaveIndexNames(uiSchema);
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
  test('All child pointers of combinations ends withe their corresponding index', () =>
    combinationChildrenHaveIndexNames(schemaNodes));
  test('The root node is an object or combination', () =>
    rootNodeIsObjectOrCombination(schemaNodes));
};
