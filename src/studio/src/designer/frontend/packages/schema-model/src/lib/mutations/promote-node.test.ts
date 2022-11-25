import { buildUiSchema } from '../build-ui-schema';
import { buildJsonSchema } from '../build-json-schema';
import { FieldType, Keywords } from '../types';
import { makePointer } from '../utils';
import { convertPropToType } from './promote-node';
import { simpleTestJsonSchema } from '../../../test/testUtils';

test('that we can convertPropToType', () => {
  const uiSchemaNodes = buildUiSchema(simpleTestJsonSchema);
  const promotedNodeMap = convertPropToType(
    uiSchemaNodes,
    makePointer(Keywords.Properties, 'world')
  );
  expect(buildJsonSchema(promotedNodeMap)).toEqual({
    [Keywords.Properties]: {
      hello: { [Keywords.Type]: FieldType.String },
      world: { [Keywords.Reference]: makePointer(Keywords.Definitions, 'world') },
    },
    [Keywords.Definitions]: { world: simpleTestJsonSchema[Keywords.Properties]['world'] },
  });
});

test('that promotePropertyToType throws errors', () => {
  const uiSchemaNodes = buildUiSchema({
    [Keywords.Properties]: {
      email: { [Keywords.Reference]: '#/$defs/email' },
    },
    [Keywords.Definitions]: {
      email: { [Keywords.Type]: FieldType.String },
    },
  });
  expect(() => convertPropToType(uiSchemaNodes, '#/$defs/email')).toThrowError();
  expect(() => convertPropToType(uiSchemaNodes, '#/properties/email')).toThrowError();
});
