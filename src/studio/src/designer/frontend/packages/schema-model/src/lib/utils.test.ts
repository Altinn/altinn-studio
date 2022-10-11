import { combinationIsNullable, createNodeBase, getParentNodeByPointer, makePointer } from './utils';
import { FieldType, ROOT_POINTER } from './types';
import { getGeneralJsonSchemaForTest } from '../../test/testUtils';
import { buildUiSchema } from './build-ui-schema';
import { expect } from '@jest/globals';

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

test('that we can check if combination is nullable', () => {
  const regularChild = createNodeBase('regular child');
  const nullableChild = createNodeBase('nullable child');
  nullableChild.fieldType = FieldType.Null;
  expect(combinationIsNullable([regularChild, regularChild])).toBeFalsy();
  expect(combinationIsNullable([regularChild, nullableChild])).toBeTruthy();
});
