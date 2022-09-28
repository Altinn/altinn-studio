import { FieldType, Keywords } from './types';
import { buildUiSchema } from './build-ui-schema';
import {
  combinationIsNullable,
  getNodeByPointer,
  getNodeDisplayName,
  getRootNodes,
  getUniqueNodePath,
} from './selectors';
import { expect } from '@jest/globals';
import { createNodeBase, makePointer } from './utils';

const testShema = {
  [Keywords.Definitions]: {
    waba: { [Keywords.Type]: FieldType.String },
    duba: { [Keywords.Type]: FieldType.String },
    dupp: { [Keywords.Type]: FieldType.String },
    dapp: {
      [Keywords.Properties]: {
        name: { [Keywords.Type]: FieldType.String },
        lame: { [Keywords.Type]: FieldType.String },
      },
    },
  },
  [Keywords.Properties]: {
    hello: { [Keywords.Type]: FieldType.String },
    world: { [Keywords.Type]: FieldType.String },
  },
};
test('that we can getRootNodes', () => {
  const uiSchemaNodes = buildUiSchema(testShema);
  expect(getRootNodes(uiSchemaNodes, true)).toHaveLength(4);
  expect(getRootNodes(uiSchemaNodes, false)).toHaveLength(2);
});

test('that we can getNodeDisplayName', () => {
  const uiSchemaNodes = buildUiSchema(testShema);
  const uiSchemaNode = getNodeByPointer(uiSchemaNodes, makePointer(Keywords.Properties, 'hello'));
  expect(getNodeDisplayName(uiSchemaNode)).toBe('hello');
});

test('that we can getUniqueNodePath', () => {
  const uiSchemaNodes = buildUiSchema(testShema);
  expect(getUniqueNodePath(uiSchemaNodes, makePointer(Keywords.Properties, 'hello'))).toBe(
    makePointer(Keywords.Properties, 'hello0'),
  );
});

test('that we can check if combination is nullable', () => {
  const regularChild = createNodeBase('regular child');
  const nullableChild = createNodeBase('nullable child');
  nullableChild.fieldType = FieldType.Null;
  expect(combinationIsNullable([regularChild, regularChild])).toBeFalsy();
  expect(combinationIsNullable([regularChild, nullableChild])).toBeTruthy();
});
