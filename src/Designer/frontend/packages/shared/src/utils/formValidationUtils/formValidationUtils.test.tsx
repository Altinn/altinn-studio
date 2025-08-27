import {
  addSchemas,
  dereferenceSchema,
  getPropertyByPath,
  isPropertyRequired,
  validate,
  validateProperty,
} from './formValidationUtils';
import expressionSchema from './test-data/expression.schema.v1.json';
import numberFormatSchema from './test-data/number-format.schema.v1.json';
import layoutSchema from './test-data/layout.schema.v1.json';
import inputSchema from './test-data/Input.schema.v1.json';
import commonDefsSchema from './test-data/common-defs.schema.v1.json';

describe('formValidationUtils', () => {
  beforeAll(() => {
    addSchemas([expressionSchema, numberFormatSchema, commonDefsSchema, layoutSchema, inputSchema]);
  });

  describe('Schema validation functions', () => {
    describe('getPropertyByPath', () => {
      it('should return object at the given path', () => {
        expect(getPropertyByPath(layoutSchema, 'definitions/component/properties/id')).toEqual(
          layoutSchema.definitions.component.properties.id,
        );
      });
    });

    describe('isPropertyRequired', () => {
      it('should return false if schema or propertyPath is missing', () => {
        expect(isPropertyRequired(null, 'definitions/component/properties/id')).toBe(false);
        expect(isPropertyRequired({}, null)).toBe(false);
      });

      it('should return true if property is required', () => {
        expect(isPropertyRequired(layoutSchema, 'definitions/component/properties/id')).toBe(true);
      });
    });

    describe('validate', () => {
      it('should validate the whole layout and return errors if validation fails', () => {
        expect(validate(layoutSchema.$id, 'test')).toEqual([
          {
            instancePath: '',
            keyword: 'type',
            message: 'must be object',
            params: { type: 'object' },
            schemaPath: '#/type',
          },
        ]);
      });
    });

    describe('validateProperty', () => {
      it('should validate property and return error keyword if validation fails', () => {
        expect(
          validateProperty(`${layoutSchema.$id}#/definitions/component/properties/id`, '@'),
        ).toEqual('pattern');
      });
    });
  });

  describe('Dereference schema', () => {
    it('should return the dereferenced schema', () => {
      expect(
        dereferenceSchema({
          $ref: 'https://altinncdn.no/schemas/json/component/common-defs.schema.v1.json#/definitions/basicDataModelBindings',
        }),
      ).toEqual({
        title: 'Data model bindings',
        description: 'Data model bindings for component',
        type: 'object',
        properties: {
          simpleBinding: {
            type: 'string',
            title: 'Simple binding',
            description:
              'Data model binding for components connection to a single field in the data model',
          },
        },
        required: ['simpleBinding'],
        additionalProperties: false,
      });
    });

    it('should still return the dereferenced schema', () => {
      expect(
        dereferenceSchema({
          properties: {
            required: {
              title: 'Required',
              description:
                'Boolean or expression indicating if the component is required when filling in the form. Defaults to false.',
              default: false,
              $ref: 'https://altinncdn.no/schemas/json/layout/expression.schema.v1.json#/definitions/boolean',
            },
          },
        }),
      ).toEqual({
        properties: {
          required: {
            title: 'Required',
            description:
              'Boolean or expression indicating if the component is required when filling in the form. Defaults to false.',
            default: false,
            $ref: 'https://altinncdn.no/schemas/json/layout/expression.schema.v1.json#/definitions/boolean',
          },
        },
      });
    });
  });
});
