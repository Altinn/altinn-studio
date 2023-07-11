import {
  combinationIsNullable,
  createNodeBase,
  getNameFromPointer,
  getUniqueNodePath,
  makePointer,
  replaceLastPointerSegment,
  isEmpty,
} from './utils';
import { FieldType, Keyword } from '../types';
import { expect } from '@jest/globals';
import { buildUiSchema } from './build-ui-schema';
import { getNodeByPointer } from './selectors';
import { selectorsTestSchema } from '../../test/testUtils';
import { rootNodeMock, uiSchemaMock } from '../../test/uiSchemaMock';
import { validateTestUiSchema } from '../../test/validateTestUiSchema';

describe('utils', () => {
  test('creatNodeBase', () => {
    const nodeBase = createNodeBase('world', 'ish');
    expect(nodeBase.objectKind).toBeDefined();
    expect(nodeBase.isRequired).toBeFalsy();
    expect(nodeBase.isNillable).toBeFalsy();
    expect(nodeBase.implicitType).toBeTruthy();
    expect(nodeBase.pointer.split('/')).toHaveLength(3);
  });

  test('makePointer', () => {
    expect(makePointer('properties', 'hello')).toBe('#/properties/hello');
    expect(makePointer('#/properties', 'hello')).toBe('#/properties/hello');
  });

  test('combinationIsNullable', () => {
    const regularChild = createNodeBase('regular child');
    const nullableChild = createNodeBase('nullable child');
    nullableChild.fieldType = FieldType.Null;
    expect(combinationIsNullable([regularChild, regularChild])).toBeFalsy();
    expect(combinationIsNullable([regularChild, nullableChild])).toBeTruthy();
  });

  test('getNameFromPointer', () => {
    const uiSchemaNodes = buildUiSchema(selectorsTestSchema);
    const uiSchemaNode = getNodeByPointer(uiSchemaNodes, makePointer(Keyword.Properties, 'hello'));
    expect(getNameFromPointer(uiSchemaNode)).toBe('hello');
  });

  test('getUniqueNodePath', () => {
    const uiSchemaNodes = buildUiSchema(selectorsTestSchema);
    expect(getUniqueNodePath(uiSchemaNodes, makePointer(Keyword.Properties, 'hello'))).toBe(
      makePointer(Keyword.Properties, 'hello0')
    );
  });

  test('replaceLastPointerSegment', () => {
    expect(replaceLastPointerSegment(makePointer('some', 'thing', 'cozy'), 'scary')).toBe(
      makePointer('some', 'thing', 'scary')
    );
    expect(replaceLastPointerSegment(makePointer('trying', 'to', 'fool'), 'to/fool')).toBe(
      makePointer('trying', 'to', 'to', 'fool')
    );
  });

  describe('isEmpty', () => {
    it('Returns true if only the root node is present', () => {
      const rootNode = { ...rootNodeMock, children: [] };
      const schema = [rootNode];
      validateTestUiSchema(schema);
      expect(isEmpty(schema)).toBe(true);
    });

    it.each([null, undefined])('Returns true if the input is %s', (input: null | undefined) => {
      expect(isEmpty(input)).toBe(true);
    });

    it('Returns false if additional nodes are present', () => {
      expect(isEmpty(uiSchemaMock)).toBe(false);
    });
  });
});
