import {
  combinationIsNullable,
  createNodeBase,
  getUniqueNodePath,
  isNodeValidParent,
  replaceLastPointerSegment,
} from './utils';
import type { UiSchemaNode } from '../types';
import { FieldType, Keyword } from '../types';
import { expect } from '@jest/globals';
import { buildUiSchema } from './build-ui-schema';
import { selectorsTestSchema } from '../../test/testUtils';
import { makePointerFromArray } from './pointerUtils';
import {
  allOfNodeMock,
  enumNodeMock,
  numberNodeMock,
  referenceNodeMock,
  simpleArrayMock,
  simpleParentNodeMock,
  stringNodeMock,
} from '../../test/uiSchemaMock';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

describe('utils', () => {
  test('creatNodeBase', () => {
    const nodeBase = createNodeBase('world', 'ish');
    expect(nodeBase.objectKind).toBeDefined();
    expect(nodeBase.isRequired).toBeFalsy();
    expect(nodeBase.isNillable).toBeFalsy();
    expect(nodeBase.implicitType).toBeTruthy();
    expect(nodeBase.pointer.split('/')).toHaveLength(3);
  });

  test('combinationIsNullable', () => {
    const regularChild = createNodeBase('regular child');
    const nullableChild = createNodeBase('nullable child');
    nullableChild.fieldType = FieldType.Null;
    expect(combinationIsNullable([regularChild, regularChild])).toBeFalsy();
    expect(combinationIsNullable([regularChild, nullableChild])).toBeTruthy();
  });

  test('getUniqueNodePath', () => {
    const uiSchemaNodes = buildUiSchema(selectorsTestSchema);
    expect(
      getUniqueNodePath(uiSchemaNodes, makePointerFromArray([Keyword.Properties, 'hello'])),
    ).toBe(makePointerFromArray([Keyword.Properties, 'hello0']));
  });

  test('replaceLastPointerSegment', () => {
    expect(
      replaceLastPointerSegment(makePointerFromArray(['some', 'thing', 'cozy']), 'scary'),
    ).toBe(makePointerFromArray(['some', 'thing', 'scary']));
    expect(
      replaceLastPointerSegment(makePointerFromArray(['trying', 'to', 'fool']), 'to/fool'),
    ).toBe(makePointerFromArray(['trying', 'to', 'to', 'fool']));
  });

  describe('isNodeValidParent', () => {
    const testData: KeyValuePairs<UiSchemaNode> = {
      'an object': simpleParentNodeMock,
      'an array': simpleArrayMock,
      'a combination': allOfNodeMock,
      'a string': stringNodeMock,
      'a number': numberNodeMock,
      'an enum': enumNodeMock,
      'a reference': referenceNodeMock,
    };

    type TestCase = [boolean, keyof typeof testData];
    const testCases: TestCase[] = [
      [true, 'an object'],
      [true, 'an array'],
      [true, 'a combination'],
      [false, 'a string'],
      [false, 'a number'],
      [false, 'an enum'],
      [false, 'a reference'],
    ];

    it.each(testCases)('Returns %s when the node is %s', (expectedResult, caseKey) => {
      expect(isNodeValidParent(testData[caseKey])).toBe(expectedResult);
    });
  });
});
