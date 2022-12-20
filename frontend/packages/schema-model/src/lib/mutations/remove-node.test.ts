import { buildUiSchema } from '../build-ui-schema';
import { removeNodeByPointer } from './remove-node';
import {
  getGeneralJsonSchemaForTest,
  simpleTestJsonSchema,
  validateSchema,
} from '../../../test/testUtils';
import { buildJsonSchema } from '../build-json-schema';
import { CombinationKind, FieldType, Keywords } from '../types';
import { makePointer } from '../utils';
import { renameNodePointer } from './rename-node';

const testComplexSchema = getGeneralJsonSchemaForTest('ElementAnnotation');

test('that we can remove a node by pointer', () => {
  const uiSchemaNodes = buildUiSchema(simpleTestJsonSchema);
  expect(uiSchemaNodes).toEqual(buildUiSchema(simpleTestJsonSchema));
  const changedNodeMap = removeNodeByPointer(
    uiSchemaNodes,
    makePointer(Keywords.Properties, 'world')
  );
  const jsonSchema = buildJsonSchema(changedNodeMap);
  expect(validateSchema(jsonSchema)).toBeTruthy();
  expect(jsonSchema).toEqual({
    [Keywords.Properties]: {
      hello: {
        [Keywords.Type]: FieldType.String,
      },
    },
  });
});
test('that we can remove an combination', () => {
  const uiSchemaNodes = buildUiSchema({
    [CombinationKind.OneOf]: [
      { [Keywords.Type]: FieldType.String },
      { [Keywords.Type]: FieldType.Null },
      { [Keywords.Type]: FieldType.Number },
    ],
  });
  const nodesAfterMutation = removeNodeByPointer(
    uiSchemaNodes,
    makePointer(CombinationKind.OneOf, 1)
  );
  const jsonSchema = buildJsonSchema(nodesAfterMutation);
  expect(jsonSchema).toEqual({
    [CombinationKind.OneOf]: [
      { [Keywords.Type]: FieldType.String },
      { [Keywords.Type]: FieldType.Number },
    ],
  });
});

test('that removeNodeByPointer throws error on unknown pointer', () => {
  const uiSchemaNodes = buildUiSchema(testComplexSchema);
  expect(() => removeNodeByPointer(uiSchemaNodes, 'fdasdfas')).toThrowError();
});
test('that removeNodeByPointer throws error on unknown pointer', () => {
  const uiSchemaNodes = buildUiSchema(testComplexSchema);
  expect(() => renameNodePointer(uiSchemaNodes, 'fdasdfas', 'asdfsadfsaasdf')).toThrowError();
});
