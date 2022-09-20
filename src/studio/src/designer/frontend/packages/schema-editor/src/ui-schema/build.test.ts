import {
  dumpToDebug,
  getGeneralJsonSchemasForTest,
  getSeresJsonSchemasForTest,
} from '../../test/testUtils';
import { JsonSchemaNode, ROOT_POINTER } from './types';
import { ObjectKind } from '../types/enums';
import { buildUiSchema } from './build-ui-schema';
import { buildJsonSchema } from './build-json-schema';

test.each(getSeresJsonSchemasForTest())(
  'Seres model %p can be converted',
  (name: string, testSchema: JsonSchemaNode) => {
    const map = buildUiSchema(testSchema);
    dumpToDebug(__dirname, name, map);
    const jsonSchema = buildJsonSchema(map);
    expect(jsonSchema).toEqual(testSchema);

    map.forEach((uiSchema) => {
      expect(uiSchema.objectKind).toBeDefined();
      expect(uiSchema.pointer).toBeDefined();
      expect(uiSchema.pointer.startsWith(ROOT_POINTER)).toBeTruthy();
      if (uiSchema.objectKind === ObjectKind.Field) {
        expect(uiSchema.fieldType).toBeDefined();
      }
    });
  },
);

test.each(getGeneralJsonSchemasForTest())(
  'General model %p can be converted',
  (name: string, testSchema: object) => {
    const map = buildUiSchema(testSchema);
    dumpToDebug(__dirname, name, map);
    const jsonSchema = buildJsonSchema(map);
    expect(jsonSchema).toEqual(testSchema);
  },
);
