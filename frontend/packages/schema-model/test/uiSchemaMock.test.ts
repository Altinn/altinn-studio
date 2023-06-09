import { uiSchemaMock } from './uiSchemaMock';
import { areItemsUnique, mapByKey, removeItemByValue } from 'app-shared/utils/arrayUtils';
import { ROOT_POINTER } from '../src';
import { getPointers } from '../src/lib/mappers/getPointers';

/**
 * Verify that the uiSchemaMock is valid.
 * Tests that depend on this mock relies on these tests to pass.
 */
describe('uiSchemaMock', () => {
  it('Has a root node', () => {
    expect(getPointers(uiSchemaMock)).toContain(ROOT_POINTER);
  });

  test('All node pointers are unique', () => {
    expect(areItemsUnique(getPointers(uiSchemaMock))).toBe(true);
  });

  test('All referenced pointers exist in the list', () => {
    uiSchemaMock.forEach(({ children }) => {
      children.forEach((childPointer) => {
        expect(getPointers(uiSchemaMock)).toContain(childPointer);
      });
    });
  });

  test('All nodes except the root node have a parent', () => {
    const allChildPointers = mapByKey(uiSchemaMock, 'children').flat();
    removeItemByValue(getPointers(uiSchemaMock), ROOT_POINTER).forEach((pointer) => {
      expect(allChildPointers).toContain(pointer);
    });
  });
});
