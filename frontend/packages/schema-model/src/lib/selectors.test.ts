import { buildUiSchema } from './build-ui-schema';
import {
  getNodeByPointer,
  getParentNodeByPointer,
  getReferredNodes,
  getRootNode,
  getRootNodes,
} from './selectors';
import { expect } from '@jest/globals';
import { getGeneralJsonSchemaForTest, selectorsTestSchema } from '../../test/testUtils';
import { ROOT_POINTER } from './constants';
import { makePointer } from './utils';
import { dataMock } from '@altinn/schema-editor/mockData';

const testSchema = getGeneralJsonSchemaForTest('ElementAnnotation');

test('getRootNodes', () => {
  const uiSchemaNodes = buildUiSchema(selectorsTestSchema);
  expect(getRootNodes(uiSchemaNodes, true)).toHaveLength(4);
  expect(getRootNodes(uiSchemaNodes, false)).toHaveLength(2);
  expect(getRootNodes(buildUiSchema({}), true)).toHaveLength(0);
  expect(getRootNodes(buildUiSchema({}), false)).toHaveLength(0);
  expect(getRootNodes([], true)).toHaveLength(0);
  expect(getRootNodes([], false)).toHaveLength(0);
});

test('getParentNodeByPointer', () => {
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

describe('getRootNode', () => {
  it('Returns the root node', () => {
    const uiSchemaNodes = buildUiSchema(testSchema);
    const rootNode = getRootNode(uiSchemaNodes);
    expect(typeof rootNode).toBe('object');
    expect(rootNode.pointer).toBe(ROOT_POINTER);
  });

  it('Returns undefined if it cannot find node by pointer', () => {
    expect(getRootNode([])).toBeUndefined();
  });
});

describe('getNodeByPointer', () => {
  test('Returns undefined if it cannot find node by pointer', () => {
    const uiSchemaNodes = buildUiSchema(testSchema);
    const pointer = makePointer('badPointer');
    const node = getNodeByPointer(uiSchemaNodes, pointer);
    expect(node).toBeUndefined();
  });
});

test('getReferredNodes', () => {
  const uiSchemaNodes = buildUiSchema(dataMock);
  const referedNodes = getReferredNodes(uiSchemaNodes, '#/$defs/RA-0678_M');
  expect(referedNodes).toHaveLength(1);
  expect(referedNodes[0].pointer).toBe('#/properties/melding');
});
