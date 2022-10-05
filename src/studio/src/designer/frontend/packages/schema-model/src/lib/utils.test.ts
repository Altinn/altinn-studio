import { createNodeBase, getParentNodeByPointer, makePointer, sortNodesByChildren } from './utils';
import { ROOT_POINTER } from './types';
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

test('that we can sortNodes', () => {
  const rootNode = createNodeBase(ROOT_POINTER);
  const child1 = createNodeBase('someother path');
  const child3 = createNodeBase('somepath');
  rootNode.children.push(child1.pointer);
  rootNode.children.push(child3.pointer);
  const child2 = createNodeBase('someother path', 'another one here');
  child1.children.push(child2.pointer);
  const testArray = [child1, child2, child3, rootNode];
  for (let i = 0; i < 5; i++) {
    testArray.sort(() => Math.random() - 0.5);
    const sorted = sortNodesByChildren(testArray);
    expect(sorted).toStrictEqual([rootNode, child1, child2, child3]);
  }
});
