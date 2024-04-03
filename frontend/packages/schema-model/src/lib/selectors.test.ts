import { buildUiSchema } from './build-ui-schema';
import {
  getNodeByPointer,
  getParentNodeByPointer,
  getReferredNodes,
  getRootNode,
} from './selectors';
import { expect } from '@jest/globals';
import { getGeneralJsonSchemaForTest } from '../../test/testUtils';
import { ROOT_POINTER } from './constants';
import { dataMock } from '@altinn/schema-editor/mockData';
import { makePointerFromArray } from './pointerUtils';

const testSchema = getGeneralJsonSchemaForTest('ElementAnnotation');

describe('selectors', () => {
  test('getParentNodeByPointer', () => {
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
      const pointer = makePointerFromArray(['badPointer']);
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
});
