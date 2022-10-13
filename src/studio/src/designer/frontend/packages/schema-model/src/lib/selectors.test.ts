import { buildUiSchema } from './build-ui-schema';
import { getNodeByPointer, getParentNodeByPointer, getRootNode, getRootNodes } from './selectors';
import { expect } from '@jest/globals';
import { getGeneralJsonSchemaForTest, selectorsTestSchema } from '../../test/testUtils';
import { ROOT_POINTER } from './constants';
import { makePointer } from './utils';

const testSchema = getGeneralJsonSchemaForTest('ElementAnnotation');

test('that we can getRootNodes', () => {
  const uiSchemaNodes = buildUiSchema(selectorsTestSchema);
  expect(getRootNodes(uiSchemaNodes, true)).toHaveLength(4);
  expect(getRootNodes(uiSchemaNodes, false)).toHaveLength(2);
  expect(getRootNodes(buildUiSchema({}), true)).toHaveLength(0);
  expect(getRootNodes(buildUiSchema({}), false)).toHaveLength(0);
  expect(getRootNodes([], true)).toHaveLength(0);
  expect(getRootNodes([], false)).toHaveLength(0);
});

test('that we getParentNodeByPointer', () => {
  // Just grab a random schema to test with.
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

test('that we can getRootNode', () => {
  const uiSchemaNodes = buildUiSchema(testSchema);
  const rootNode = getRootNode(uiSchemaNodes);
  expect(typeof rootNode).toBe('object');
  expect(rootNode.pointer).toBe(ROOT_POINTER);
});

test('that getNodeByPointer throws at undefined pointer', () => {
  const uiSchemaNodes = buildUiSchema(testSchema);
  expect(() => {
    getNodeByPointer(uiSchemaNodes, makePointer('jibberish'));
  }).toThrow();
});

test('that getRootNode throws at undefined pointer', () => {
  expect(() => {
    getRootNode([]);
  }).toThrow();
});
