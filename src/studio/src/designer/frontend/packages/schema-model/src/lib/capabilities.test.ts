import { Capabilites, getCapabilities } from './capabilities';
import { createNodeBase } from './utils';
import { FieldType, ObjectKind } from './types';
import { expect } from '@jest/globals';

test('that capabilities work as expected', () => {
  const test = createNodeBase('asdfas');
  test.objectKind = ObjectKind.Field;
  test.fieldType = FieldType.String;
  const caps = getCapabilities(test);
  expect(caps.sort()).toStrictEqual(
    [
      Capabilites.CanBeConvertedToArray,
      Capabilites.CanBeConvertedToReference,
      Capabilites.CanBeDeleted,
    ].sort()
  );
});
