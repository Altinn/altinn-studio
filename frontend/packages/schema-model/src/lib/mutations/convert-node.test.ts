import { buildUiSchema } from '../build-ui-schema';
import { buildJsonSchema } from '../build-json-schema';
import { FieldType, Keyword } from '../../types';
import { convertPropToType } from './convert-node';
import { simpleTestJsonSchema } from '../../../test/testUtils';
import { makePointerFromArray } from '../pointerUtils';
import { SchemaModel } from '../SchemaModel';

describe('convert-node', () => {
  describe('convertPropToType', () => {
    it('Converts prop to type', () => {
      const uiSchemaNodes = buildUiSchema(simpleTestJsonSchema);
      const promotedNodeMap = convertPropToType(
        SchemaModel.fromArray(uiSchemaNodes),
        makePointerFromArray([Keyword.Properties, 'world']),
      ).asArray();
      expect(buildJsonSchema(promotedNodeMap)).toEqual({
        [Keyword.Properties]: {
          hello: { [Keyword.Type]: FieldType.String },
          world: { [Keyword.Reference]: makePointerFromArray([Keyword.Definitions, 'world']) },
        },
        [Keyword.Definitions]: { world: simpleTestJsonSchema[Keyword.Properties]['world'] },
      });
    });

    it('Throws errors', () => {
      const uiSchemaNodes = buildUiSchema({
        [Keyword.Properties]: {
          email: { [Keyword.Reference]: makePointerFromArray([Keyword.Definitions, 'emailType']) },
        },
        [Keyword.Definitions]: {
          emailType: { [Keyword.Type]: FieldType.String },
        },
      });
      const model = SchemaModel.fromArray(uiSchemaNodes);
      expect(() => convertPropToType(model, '#/$defs/email')).toThrowError();
      expect(() => convertPropToType(model, '#/properties/email')).toThrowError();
    });
  });
});
