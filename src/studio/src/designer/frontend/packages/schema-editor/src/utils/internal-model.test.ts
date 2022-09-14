import {
  createJsonSchema,
  createUiSchema,
  ROOT_POINTER,
} from './internal-model';
import {
  getGeneralJsonSchemasForTest,
  getSeresJsonSchemasForTest,
} from '../../test/testUtils';
import { ObjectKind } from '../types/enums';
import fs from 'fs';

test.each(getSeresJsonSchemasForTest())(
  'Seres model %p can be converted',
  (name: string, testSchema: object) => {
    const map = createUiSchema(testSchema);
    fs.writeFileSync(
      __dirname + '/debug/' + name + '.json',
      JSON.stringify(Array.from(map.values()), null, 4),
      'utf-8',
    );
    const jsonSchema = createJsonSchema(map);
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
    //console.log(JSON.stringify(Object.fromEntries(map), null, 4));
  },
);

test.each(getGeneralJsonSchemasForTest())(
  'General model %p can be converted',
  (name: string, testSchema: object) => {
    const map = createUiSchema(testSchema);
    fs.writeFileSync(
      __dirname + '/debug/' + name + '.json',
      JSON.stringify(Array.from(map.values()), null, 4),
      'utf-8',
    );
    const jsonSchema = createJsonSchema(map);
    expect(jsonSchema).toEqual(testSchema);

    //console.log(JSON.stringify(Object.fromEntries(map), null, 4));
  },
);

/*
test("spesial casa",()=>{
    getGeneralJsonSchemasForTest().find([test,schema]=>{});
});

 */
