import { createNodeBase, getParentNodeByPointer } from './utils';
import { ROOT_POINTER } from './types';
import { getGeneralJsonSchemaForTest } from '../../test/testUtils';
import { buildUiSchema } from './build-ui-schema';

test('creatNodeBase', () => {
  const nodeBase = createNodeBase(ROOT_POINTER, 'world', 'ish');
  expect(nodeBase.objectKind).toBeDefined();
  expect(nodeBase.isRequired).toBeFalsy();
  expect(nodeBase.isNillable).toBeFalsy();
  expect(nodeBase.implicitType).toBeFalsy();
  expect(nodeBase.pointer.split('/')).toHaveLength(3);
});

test('that we get parent node', () => {
  // Just grab a random schema to test with.
  const testSchema = getGeneralJsonSchemaForTest('ComplexSchema');
  const map = buildUiSchema(testSchema);
  map.forEach((uiNode) => {
    const parentNode = getParentNodeByPointer(map, uiNode.pointer);
    if (parentNode) {
      expect(parentNode.children).toContain(uiNode.pointer);
    } else {
      expect(uiNode.pointer).toEqual(ROOT_POINTER);
    }
  });
});
