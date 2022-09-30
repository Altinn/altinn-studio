import { toggleArrayAndField } from './toggle-array-field';
import { FieldType, Keywords } from '../types';
import { buildUiSchema } from '../build-ui-schema';
import { makePointer } from '../utils';
import { buildJsonSchema } from '../build-json-schema';
import { validateSchema } from '../../../test/testUtils';

const testStringProp = {
  [Keywords.Type]: FieldType.String,
};
const objectProps = {
  [Keywords.Properties]: {
    south: testStringProp,
    north: testStringProp,
  },
};
const testSchema = {
  [Keywords.Properties]: {
    hello: testStringProp,
    world: objectProps,
  },
};

test('that we can toggle between array and field', () => {
  const pointer = makePointer(Keywords.Properties, 'world');
  const uiNodes1 = buildUiSchema(testSchema);
  const uiNodes2 = toggleArrayAndField(uiNodes1, pointer);
  const jsonSchema1 = buildJsonSchema(uiNodes2);
  expect(validateSchema(jsonSchema1)).toBeTruthy();
  expect(jsonSchema1).toStrictEqual({
    [Keywords.Properties]: {
      hello: testStringProp,
      world: {
        [Keywords.Type]: FieldType.Array,
        items: objectProps,
      },
    },
  });
  const uiNodes3 = toggleArrayAndField(uiNodes2, pointer);
  const jsonSchema2 = buildJsonSchema(uiNodes3);
  expect(validateSchema(jsonSchema2)).toBeTruthy();
  expect(jsonSchema2).toEqual(testSchema);
});
