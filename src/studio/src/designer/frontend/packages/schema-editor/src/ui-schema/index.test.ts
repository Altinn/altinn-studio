import { getGeneralJsonSchemasForTest, getSeresJsonSchemasForTest } from '../../test/testUtils';
import fs from 'fs';
import { JsonSchemaNode, ROOT_POINTER } from './types';
import { toJsonSchema, toUiSchema } from './index';
import { ObjectKind } from '../types/enums';

test.each(getSeresJsonSchemasForTest())(
  'Seres model %p can be converted',
  (name: string, testSchema: JsonSchemaNode) => {
    const map = toUiSchema(testSchema);
    fs.writeFileSync(
      __dirname + '/debug/' + name + '.json',
      JSON.stringify(Array.from(map.values()), null, 4),
      'utf-8',
    );
    const jsonSchema = toJsonSchema(map);
    expect(jsonSchema).toEqual(testSchema);

    map.forEach((uiSchema) => {
      expect(uiSchema.objectKind).toBeDefined();
      expect(uiSchema.pointer).toBeDefined();
      expect(uiSchema.pointer.startsWith(ROOT_POINTER)).toBeTruthy();
      if (uiSchema.objectKind === ObjectKind.Field) {
        if (!uiSchema.fieldType) {
          console.log(uiSchema);
        }
        expect(uiSchema.fieldType).toBeDefined();
      }
    });
  },
);

test.each(getGeneralJsonSchemasForTest())(
  'General model %p can be converted',
  (name: string, testSchema: object) => {
    const map = toUiSchema(testSchema);
    fs.writeFileSync(
      __dirname + '/debug/' + name + '.json',
      JSON.stringify(Array.from(map.values()), null, 4),
      'utf-8',
    );
    const jsonSchema = toJsonSchema(map);
    expect(jsonSchema).toEqual(testSchema);

    //console.log(JSON.stringify(Object.fromEntries(map), null, 4));
  },
);

/*
test("spesial casa",()=>{
    getGeneralJsonSchemasForTest().find([test,schema]=>{});
});

 */
