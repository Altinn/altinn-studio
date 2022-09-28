import {
  createNodeBase,
  createNodeId,
  createPointerLookupTable,
  getParentNodeByPointer,
} from './utils';
import { ROOT_POINTER, UiSchemaMap } from './types';
import { getGeneralJsonSchemaForTest } from '../../test/testUtils';
import { buildUiSchema } from './build-ui-schema';

test('creatNodeBase', () => {
  const nodeBase = createNodeBase(ROOT_POINTER, 'world', 'ish');
  expect(nodeBase.objectKind).toBeDefined();
  expect(nodeBase.nodeId).toBeDefined();
  expect(nodeBase.isRequired).toBeFalsy();
  expect(nodeBase.isNillable).toBeFalsy();
  expect(nodeBase.implicitType).toBeFalsy();
  expect(nodeBase.pointer.split('/')).toHaveLength(3);
});

test('createPointerLookupTable', () => {
  const map: UiSchemaMap = new Map();
  const ids: number[] = [];
  const pointers: string[] = [];
  [...Array(10)].forEach(() => {
    const node = createNodeBase(ROOT_POINTER, createNodeId().toString());
    ids.push(node.nodeId);
    pointers.push(node.pointer);
    map.set(node.nodeId, node);
  });

  const lookupMap = createPointerLookupTable(map);
  expect(Array.from(lookupMap.keys())).toEqual(pointers);
  expect(Array.from(lookupMap.values())).toEqual(ids);
});

test('that we get parent node', () => {
  // Just grab a random schema to test with.
  const testSchema = getGeneralJsonSchemaForTest('ComplexSchema');
  const map = buildUiSchema(testSchema);
  map.forEach((uiNode) => {
    const parentNode = getParentNodeByPointer(map, uiNode.pointer);
    if (parentNode) {
      expect(parentNode.children).toContain(uiNode.nodeId);
    } else {
      expect(uiNode.pointer).toEqual(ROOT_POINTER);
    }
  });
});
