import { ROOT_POINTER, UiSchemaNodes } from '../src';
import { getPointers } from '../src/lib/mappers/getPointers';
import { areItemsUnique, mapByKey, removeItemByValue } from 'app-shared/utils/arrayUtils';

/** Verifies that there is a root node */
export const hasRootNode = (uiSchema: UiSchemaNodes) =>
  expect(getPointers(uiSchema)).toContain(ROOT_POINTER);

/** Verifies that all pointers are unique */
export const pointersAreUnique = (uiSchema: UiSchemaNodes) =>
  expect(areItemsUnique(getPointers(uiSchema))).toBe(true);

/** Verifies that all pointers referenced to as children exist */
export const allPointersExist = (uiSchema: UiSchemaNodes) => {
  uiSchema.forEach(({ children }) => {
    children.forEach((childPointer) => {
      expect(getPointers(uiSchema)).toContain(childPointer);
    });
  });
};

/** Verifies that all nodes except the root node have a parent */
export const nodesHaveParent = (uiSchema: UiSchemaNodes) => {
  const allChildPointers = mapByKey(uiSchema, 'children').flat();
  removeItemByValue(getPointers(uiSchema), ROOT_POINTER).forEach((pointer) => {
    expect(allChildPointers).toContain(pointer);
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
};
