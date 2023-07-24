import { uiSchemaNodesMock } from './uiSchemaMock';
import {
  allPointersExist,
  hasRootNode,
  nodesHaveParent,
  pointersAreUnique,
} from '../../../schema-model/test/validateTestUiSchema';

/**
 * Verify that the uiSchemaMock is valid.
 * Tests that depend on this mock relies on these tests to pass.
 */
describe('uiSchemaNodesMock', () => {
  it('Has a root node', () => hasRootNode(uiSchemaNodesMock));
  test('All node pointers are unique', () => pointersAreUnique(uiSchemaNodesMock));
  test('All referenced pointers exist in the list', () => allPointersExist(uiSchemaNodesMock));
  test('All nodes except the root node have a parent', () => nodesHaveParent(uiSchemaNodesMock));
});
