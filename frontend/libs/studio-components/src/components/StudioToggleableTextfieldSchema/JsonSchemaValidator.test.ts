import { JsonSchemaValidator } from './JsonSchemaValidator';
import { type JsonSchema } from '../../types/JSONSchema';

const defaultLayoutSchemaMock: JsonSchema = {
  $id: 'id',
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  definitions: {
    component: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          title: 'id',
          pattern: '^[0-9a-zA-Z][0-9a-zA-Z-]*(-?[a-zA-Z]+|[a-zA-Z][0-9]+|-[0-9]{6,})$',
          description:
            'The component ID. Must be unique within all layouts/pages in a layout-set. Cannot end with <dash><number>.',
        },
      },
      required: ['id'],
    },
  },
};

describe('JsonSchemaValidator', () => {
  describe('isPropertyRequired', () => {
    it('should return true if property is required', () => {
      const validator = new JsonSchemaValidator(defaultLayoutSchemaMock, []);
      const validationResult = validator.isPropertyRequired('definitions/component/properties/id');
      expect(validationResult).toBe(true);
    });

    it('should return false if property is not required', () => {
      const layoutSchemaMock: JsonSchema = {
        ...defaultLayoutSchemaMock,
        definitions: {
          component: {
            ...defaultLayoutSchemaMock.definitions.component,
            required: [],
          },
        },
      };
      const validator = new JsonSchemaValidator(layoutSchemaMock, []);
      const validationResult = validator.isPropertyRequired('definitions/component/properties/id');
      expect(validationResult).toBe(false);
    });
  });

  describe('validateProperty', () => {
    it('should return error message if value is invalid', () => {
      const validator = new JsonSchemaValidator(defaultLayoutSchemaMock, []);
      const invalidValueType = 'invalid-value';
      const validationResult = validator.validateProperty('id', invalidValueType);
      expect(validationResult).toBe('type');
    });

    it('should return null if value is valid', () => {
      const validator = new JsonSchemaValidator(defaultLayoutSchemaMock, []);
      const validValueType = { id: 'valid-value' };
      const validationResult = validator.validateProperty('id', validValueType);
      expect(validationResult).toBe(null);
    });
  });
});
