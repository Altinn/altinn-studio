import {
  dumpToDebug,
  getGeneralJsonSchemasForTest,
  getSeresJsonSchemasForTest,
  validateSchema,
} from '../../test/testUtils';

import oldSchema from '../../test/old-schema.json';
import { JsonSchemaNode, ObjectKind } from './types';
import { buildUiSchema } from './build-ui-schema';
import { buildJsonSchema } from './build-json-schema';
import { ROOT_POINTER } from './constants';
import { expect } from '@jest/globals';

test.each(getSeresJsonSchemasForTest())(
  'Seres model %p can be converted',
  (name: string, testSchema: JsonSchemaNode) => {
    const uiSchemaNodes = buildUiSchema(testSchema);
    dumpToDebug(__dirname, name, uiSchemaNodes);
    const jsonSchema = buildJsonSchema(uiSchemaNodes);
    expect(jsonSchema).toEqual(testSchema);

    uiSchemaNodes.forEach((uiSchema) => {
      expect(uiSchema.objectKind).toBeDefined();
      expect(uiSchema.pointer).toBeDefined();
      expect(uiSchema.pointer.startsWith(ROOT_POINTER)).toBeTruthy();
      if (uiSchema.objectKind === ObjectKind.Field) {
        expect(uiSchema.fieldType).toBeDefined();
      }
    });
  },
);

test.each(getGeneralJsonSchemasForTest())('General model %p can be converted', (name: string, testSchema: object) => {
  const uiSchemaNodes = buildUiSchema(testSchema);
  dumpToDebug(__dirname, name, uiSchemaNodes);
  const jsonSchema = buildJsonSchema(uiSchemaNodes);
  expect(jsonSchema).toEqual(testSchema);
});

test('That we can convert old schemas too', () => {
  const uiSchemaNodes = buildUiSchema(oldSchema);
  const jsonSchema = buildJsonSchema(uiSchemaNodes);
  dumpToDebug(__dirname, 'old-schema', jsonSchema);
  expect(validateSchema(jsonSchema)).toBeTruthy();
});
