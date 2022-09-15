import { createNodeBase, createNodeId, createPointerLookupTable } from './utils';
import { ROOT_POINTER, UiSchemaNode } from './types';

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
  const map = new Map<string, UiSchemaNode>();
  const ids: string[] = [];
  const pointers: string[] = [];
  [...Array(10)].forEach(() => {
    const node = createNodeBase(ROOT_POINTER, createNodeId());
    ids.push(node.nodeId);
    pointers.push(node.pointer);
    map.set(node.nodeId, node);
  });

  const lookupMap = createPointerLookupTable(map);
  expect(Array.from(lookupMap.keys())).toEqual(pointers);
  expect(Array.from(lookupMap.values())).toEqual(ids);
});
