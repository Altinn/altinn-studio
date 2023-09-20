import { buildUiSchema } from '../build-ui-schema';
import { removeNodeByPointer } from './remove-node';
import {
  getGeneralJsonSchemaForTest,
  simpleTestJsonSchema,
  validateSchema,
} from '../../../test/testUtils';
import { buildJsonSchema } from '../build-json-schema';
import { CombinationKind, FieldType, Keyword } from '../../types';
import { makePointer } from '../utils';

const testComplexSchema = getGeneralJsonSchemaForTest('ElementAnnotation');

describe('removeNodeByPointer', () => {
  it('Can remove a node by pointer', () => {
    const uiSchemaNodes = buildUiSchema(simpleTestJsonSchema);
    expect(uiSchemaNodes).toEqual(buildUiSchema(simpleTestJsonSchema));
    const changedNodeMap = removeNodeByPointer(
      uiSchemaNodes,
      makePointer(Keyword.Properties, 'world'),
    );
    const jsonSchema = buildJsonSchema(changedNodeMap);
    expect(validateSchema(jsonSchema)).toBeTruthy();
    expect(jsonSchema).toEqual({
      [Keyword.Properties]: {
        hello: {
          [Keyword.Type]: FieldType.String,
        },
      },
    });
  });

  it('Can remove a combination', () => {
    const uiSchemaNodes = buildUiSchema({
      [CombinationKind.OneOf]: [
        { [Keyword.Type]: FieldType.String },
        { [Keyword.Type]: FieldType.Null },
        { [Keyword.Type]: FieldType.Number },
      ],
    });
    const nodesAfterMutation = removeNodeByPointer(
      uiSchemaNodes,
      makePointer(CombinationKind.OneOf, 1),
    );
    const jsonSchema = buildJsonSchema(nodesAfterMutation);
    expect(jsonSchema).toEqual({
      [CombinationKind.OneOf]: [
        { [Keyword.Type]: FieldType.String },
        { [Keyword.Type]: FieldType.Number },
      ],
    });
  });

  it('Throws error on unknown pointer', () => {
    const uiSchemaNodes = buildUiSchema(testComplexSchema);
    expect(() => removeNodeByPointer(uiSchemaNodes, 'fdasdfas')).toThrowError();
  });

  it('Can remove a node with names that start with the same characters ', () => {
    const uiSchemaNodes = buildUiSchema({
      [Keyword.Properties]: {
        name0: {
          [Keyword.Type]: FieldType.String,
        },
        name: {
          [Keyword.Type]: FieldType.String,
        },
      },
    });
    const mutatedSchema = removeNodeByPointer(
      uiSchemaNodes,
      makePointer(Keyword.Properties, 'name'),
    );
    const jsonSchema = buildJsonSchema(mutatedSchema);
    expect(jsonSchema).toStrictEqual({ properties: { name0: { type: 'string' } } });
  });
});
