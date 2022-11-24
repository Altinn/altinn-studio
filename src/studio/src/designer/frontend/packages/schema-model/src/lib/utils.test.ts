import {
  combinationIsNullable,
  createNodeBase,
  getNodeDisplayName,
  getUniqueNodePath,
  makePointer,
  replaceLastPointerSegment,
} from './utils';
import { FieldType, Keywords } from './types';
import { expect } from '@jest/globals';
import { buildUiSchema } from './build-ui-schema';
import { getNodeByPointer } from './selectors';
import { selectorsTestSchema } from '../../test/testUtils';

test('that we can creatNodeBase', () => {
  const nodeBase = createNodeBase('world', 'ish');
  expect(nodeBase.objectKind).toBeDefined();
  expect(nodeBase.isRequired).toBeFalsy();
  expect(nodeBase.isNillable).toBeFalsy();
  expect(nodeBase.implicitType).toBeTruthy();
  expect(nodeBase.pointer.split('/')).toHaveLength(3);
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

test('that we can getNodeDisplayName', () => {
  const uiSchemaNodes = buildUiSchema(selectorsTestSchema);
  const uiSchemaNode = getNodeByPointer(uiSchemaNodes, makePointer(Keywords.Properties, 'hello'));
  expect(getNodeDisplayName(uiSchemaNode)).toBe('hello');
});

test('that we can getUniqueNodePath', () => {
  const uiSchemaNodes = buildUiSchema(selectorsTestSchema);
  expect(getUniqueNodePath(uiSchemaNodes, makePointer(Keywords.Properties, 'hello'))).toBe(
    makePointer(Keywords.Properties, 'hello0')
  );
});

test('that we can replaceLastPointerSegment', () => {
  expect(replaceLastPointerSegment(makePointer('some', 'thing', 'cozy'), 'scary')).toBe(
    makePointer('some', 'thing', 'scary')
  );
  expect(replaceLastPointerSegment(makePointer('trying', 'to', 'fool'), 'to/fool')).toBe(
    makePointer('trying', 'to', 'to', 'fool')
  );
});
