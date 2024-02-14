import Ajv from 'ajv';
import StudioSchemaUtils from './StudioSchemaUtils';

const newAjvInstance = new Ajv({
  allErrors: true,
  strict: false,
});

const studioSchemaUtils = new StudioSchemaUtils(newAjvInstance);

const schema = studioSchemaUtils.getSchema(
  'https://altinncdn.no/schemas/json/component/field.schema.json',
);
export const propertyValidation = studioSchemaUtils.validateProperty(
  'https://altinncdn.no/schemas/json/component/field.schema.json',
  'test',
);

export const isPropertyRequired = studioSchemaUtils.isPropertyRequired(schema, 'properties/label');
