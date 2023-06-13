import { uiSchemaMock } from './uiSchemaMock';
import {
  allPointersExist,
  hasRootNode,
  nodesHaveParent,
  pointersAreUnique,
} from './validateTestUiSchema';

/**
 * Verify that the uiSchemaMock is valid.
 * Tests that depend on this mock relies on these tests to pass.
 */
describe('uiSchemaMock', () => {
  it('Has a root node', () => hasRootNode(uiSchemaMock));
  test('All node pointers are unique', () => pointersAreUnique(uiSchemaMock));
  test('All referenced pointers exist in the list', () => allPointersExist(uiSchemaMock));
  test('All nodes except the root node have a parent', () => nodesHaveParent(uiSchemaMock));
});
