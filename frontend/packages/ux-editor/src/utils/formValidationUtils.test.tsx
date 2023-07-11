import {
  addSchemas,
  getPropertyByPath,
  isPropertyRequired,
  validate,
  validateProperty,
} from './formValidationUtils';
import expressionSchema from '../testing/schemas/json/layout/expression.schema.v1.json';
import numberFormatSchema from '../testing/schemas/json/layout/number-format.schema.v1.json';
import layoutSchema from '../testing/schemas/json/layout/layout.schema.v1.json';

addSchemas([expressionSchema, numberFormatSchema, layoutSchema]);

describe('formValidationUtils', () => {
  describe('Schema validation functions', () => {
    describe('getPropertyByPath', () => {
      it('should return object at the given path', () => {
        expect(getPropertyByPath(layoutSchema, 'definitions/component/properties/id')).toEqual(layoutSchema.definitions.component.properties.id);
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
        expect(validate(layoutSchema.$id, 'test')).toEqual([{ "instancePath": "", "keyword": "type", "message": "must be object", "params": { "type": "object" }, "schemaPath": "#/type" }]);
      });
    });

    describe('validateProperty', () => {
      it('should validate property and return error keyword if validation fails', () => {
        expect(validateProperty(`${layoutSchema.$id}#/definitions/component/properties/id`, '@')).toEqual('pattern');
      });
    });
  });
});
