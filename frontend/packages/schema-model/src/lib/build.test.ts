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
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import { validateTestUiSchema } from '../../test/validateTestUiSchema';

describe('build', () => {
  test.each(getSeresJsonSchemasForTest())(
    'Seres model %p can be converted',
    (name: string, testSchema: JsonSchema) => {
      const uiSchemaNodes = buildUiSchema(testSchema);
      dumpToDebug(__dirname, name, uiSchemaNodes);
      validateTestUiSchema(uiSchemaNodes);
      const jsonSchema = buildJsonSchema(uiSchemaNodes);
      expect(jsonSchema).toEqual(testSchema);

      uiSchemaNodes.forEach((node) => {
        expect(node.objectKind).toBeDefined();
        expect(node.pointer).toBeDefined();
        expect(node.pointer.startsWith(ROOT_POINTER)).toBeTruthy();
        if (node.objectKind === ObjectKind.Field) {
          expect(node.fieldType).toBeDefined();
        }
      });
    },
  );

  test.each(getGeneralJsonSchemasForTest())(
    'General model %p can be converted',
    (name: string, testSchema: JsonSchema) => {
      const uiSchemaNodes = buildUiSchema(testSchema);
      dumpToDebug(__dirname, name, uiSchemaNodes);
      validateTestUiSchema(uiSchemaNodes);
      const jsonSchema = buildJsonSchema(uiSchemaNodes);
      expect(jsonSchema).toEqual(testSchema);
    },
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
});
