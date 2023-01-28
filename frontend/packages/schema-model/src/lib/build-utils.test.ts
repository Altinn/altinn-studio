import { assignRootIfDefined } from './build-utils';
import type { UiSchemaNode } from './types';
import { Keywords } from './types';

const base: UiSchemaNode = {
  children: [],
  custom: undefined,
  fieldType: undefined,
  implicitType: false,
  isArray: false,
  isCombinationItem: false,
  isNillable: false,
  isRequired: false,
  objectKind: undefined,
  pointer: '/',
  restrictions: undefined,
  description: undefined,
};
test('Does put defined on the out object', () => {
  const testNodeWithDesc: UiSchemaNode = {
    ...base,
    description: 'some string',
  };
  const out = {};
  Object.keys(testNodeWithDesc).forEach((key) =>
    assignRootIfDefined(out, testNodeWithDesc, key as Keywords)
  );
  const expected = {
    children: [],
    implicitType: false,
    isArray: false,
    isCombinationItem: false,
    isNillable: false,
    isRequired: false,
    pointer: '/',
    description: 'some string',
  };
  expect(out).toEqual(expected);
  expect(Object.keys(out)).toEqual(Object.keys(expected));
  expect(Object.keys(out).length).not.toEqual(Object.keys(testNodeWithDesc).length);
});
test('Does not put undefined on the out object', () => {
  const out = {};
  Object.keys(base).forEach((key) =>
    assignRootIfDefined(out, base, key as Keywords)
  );
  const expected = {
    children: [],
    implicitType: false,
    isArray: false,
    isCombinationItem: false,
    isNillable: false,
    isRequired: false,
    pointer: '/',
  };
  expect(out).toEqual(expected);
  expect(Object.keys(out)).toEqual(Object.keys(expected));
  expect(Object.keys(out).length).not.toEqual(Object.keys(base).length);
});
