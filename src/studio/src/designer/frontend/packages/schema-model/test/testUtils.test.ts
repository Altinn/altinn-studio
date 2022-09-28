import {
  getGeneralJsonSchemasForTest,
  getSeresJsonSchemasForTest,
  validateSchema,
} from './testUtils';

test.each(getSeresJsonSchemasForTest())(
  'that %p seres schema is valid',
  (name: string, testSchema: object) => {
    expect(validateSchema(testSchema)).toBeTruthy();
  },
);

test.each(getGeneralJsonSchemasForTest())(
  'that %p general schema is valid',
  (name: string, testSchema: object) => {
    expect(validateSchema(testSchema)).toBeTruthy();
  },
);
