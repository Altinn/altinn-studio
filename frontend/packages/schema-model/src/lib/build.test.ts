import {
  dumpToDebug,
  getGeneralJsonSchemasForTest,
  getOldJsonSchemaForTest,
  getSeresJsonSchemasForTest,
  validateSchema,
} from '../../test/testUtils';

import { ObjectKind } from '../types';
import { buildUiSchema } from './build-ui-schema';
import { buildJsonSchema } from './build-json-schema';
import { ROOT_POINTER } from './constants';
import { dataMock } from '@altinn/schema-editor/mockData';
import { JSONSchema7 } from 'json-schema';

test.each(getSeresJsonSchemasForTest())(
  'Seres model %p can be converted',
  (name: string, testSchema: JSONSchema7) => {
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
  }
);

test.each(getGeneralJsonSchemasForTest())(
  'General model %p can be converted',
  (name: string, testSchema: JSONSchema7) => {
    const uiSchemaNodes = buildUiSchema(testSchema);
    dumpToDebug(__dirname, name, uiSchemaNodes);
    const jsonSchema = buildJsonSchema(uiSchemaNodes);
    expect(jsonSchema).toEqual(testSchema);
  }
);

test('That we can convert old schemas too', () => {
  const oldSchema = getOldJsonSchemaForTest();
  const uiSchemaNodes = buildUiSchema(oldSchema);
  const jsonSchema = buildJsonSchema(uiSchemaNodes);
  dumpToDebug(__dirname, 'old-schema', jsonSchema);
  expect(validateSchema(jsonSchema)).toBeTruthy();
});

test('that schema-editor mock data works', () => {
  const uiSchemaNodes = buildUiSchema(dataMock);
  const jsonSchema = buildJsonSchema(uiSchemaNodes);
  expect(validateSchema(jsonSchema)).toBeTruthy();
  expect(jsonSchema).toEqual(dataMock);
});
