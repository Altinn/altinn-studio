import {
  getGeneralJsonSchemasForTest,
  getSeresJsonSchemasForTest,
} from './testUtils';
import Ajv2020 from 'ajv/dist/2020';

test('that we get test json schemas', () => {
  const schemas = getSeresJsonSchemasForTest();
  schemas.forEach((value) => {
    expect(new Ajv2020().validateSchema(value)).toBeTruthy();
  });
  expect(schemas.length).toBeGreaterThan(3);
});

test('that we get test json schemas', () => {
  const schemas = getGeneralJsonSchemasForTest();
  schemas.forEach((value) => {
    expect(new Ajv2020().validateSchema(value)).toBeTruthy();
  });
  expect(schemas.length).toBeGreaterThan(3);
});
