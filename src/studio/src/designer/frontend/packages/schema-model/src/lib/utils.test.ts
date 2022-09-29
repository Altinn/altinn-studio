import { createNodeBase, getParentNodeByPointer, makePointer } from './utils';
import { ROOT_POINTER } from './types';
import { getGeneralJsonSchemaForTest } from '../../test/testUtils';
import { buildUiSchema } from './build-ui-schema';

test('that we can creatNodeBase', () => {
  const nodeBase = createNodeBase('world', 'ish');
  expect(nodeBase.objectKind).toBeDefined();
  expect(nodeBase.isRequired).toBeFalsy();
  expect(nodeBase.isNillable).toBeFalsy();
  expect(nodeBase.implicitType).toBeTruthy();
  expect(nodeBase.pointer.split('/')).toHaveLength(3);
});

test('that we getParentNodeByPointer', () => {
  // Just grab a random schema to test with.
  const testSchema = getGeneralJsonSchemaForTest('ComplexSchema');
  const uiSchemaNodes = buildUiSchema(testSchema);
  uiSchemaNodes.forEach((uiNode) => {
    const parentNode = getParentNodeByPointer(uiSchemaNodes, uiNode.pointer);
    if (parentNode) {
      expect(parentNode.children).toContain(uiNode.pointer);
    } else {
      expect(uiNode.pointer).toEqual(ROOT_POINTER);
    }
  });
});

test('that we can makePointer', () => {
  expect(makePointer('properties', 'hello')).toBe('#/properties/hello');
  expect(makePointer('#/properties', 'hello')).toBe('#/properties/hello');
});
