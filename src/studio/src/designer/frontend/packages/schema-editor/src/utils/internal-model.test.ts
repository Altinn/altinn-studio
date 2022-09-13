import { createJsonSchema, createUiSchema } from './internal-model';
import {
  getGeneralJsonSchemasForTest,
  getSeresJsonSchemasForTest,
} from '../../test/testUtils';

test.each(getSeresJsonSchemasForTest())(
  'Seres model %p can be converted',
  (name: string, testSchema: object) => {
    const map = createUiSchema(testSchema);
    const jsonSchema = createJsonSchema(map);
    expect(jsonSchema).toEqual(testSchema);

    //console.log(JSON.stringify(Object.fromEntries(map), null, 4));
  },
);

test.each(getGeneralJsonSchemasForTest())(
  'General model %p can be converted',
  (name: string, testSchema: object) => {
    const map = createUiSchema(testSchema);
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
