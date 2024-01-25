import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { deleteProperty, propertyType, setProperty } from './custom-properties';
import { CustomPropertyType } from '../../types';

// Test data:
const stringPropKey = 'someStringProp';
const numberPropKey = 'someNumberProp';
const booleanPropKey = 'someBooleanProp';
const unsupportedPropKey = 'someUnsupportedProp';
const stringPropValue = 'test';
const numberPropValue = 123;
const booleanPropValue = true;
const unsupportedPropValue = {};
const customProperties: KeyValuePairs = {
  [stringPropKey]: stringPropValue,
  [numberPropKey]: numberPropValue,
  [booleanPropKey]: booleanPropValue,
  [unsupportedPropKey]: unsupportedPropValue,
};

describe('custom-properties', () => {
  describe('deleteProperty', () => {
    it('Deletes the given property', () => {
      expect(deleteProperty(customProperties, stringPropKey)).toEqual({
        [numberPropKey]: numberPropValue,
        [booleanPropKey]: booleanPropValue,
        [unsupportedPropKey]: unsupportedPropValue,
      });
    });
  });

  describe('propertyType', () => {
    it('Returns CustomPropertyType.String for string properties', () => {
      expect(propertyType(customProperties, stringPropKey)).toEqual(CustomPropertyType.String);
    });

    it('Returns CustomPropertyType.Number for number properties', () => {
      expect(propertyType(customProperties, numberPropKey)).toEqual(CustomPropertyType.Number);
    });

    it('Returns CustomPropertyType.Boolean for boolean properties', () => {
      expect(propertyType(customProperties, booleanPropKey)).toEqual(CustomPropertyType.Boolean);
    });

    it('Returns CustomPropertyType.Unsupported for unsupported properties', () => {
      expect(propertyType(customProperties, unsupportedPropKey)).toEqual(
        CustomPropertyType.Unsupported,
      );
    });
  });

  describe('setProperty', () => {
    it('Sets the given property to the given value', () => {
      const newStringPropValue = 'new value';
      const newNumberPropValue = 456;
      const newBooleanPropValue = false;

      expect(setProperty(customProperties, stringPropKey, newStringPropValue)).toEqual({
        ...customProperties,
        [stringPropKey]: newStringPropValue,
      });

      expect(setProperty(customProperties, numberPropKey, newNumberPropValue)).toEqual({
        ...customProperties,
        [numberPropKey]: newNumberPropValue,
      });

      expect(setProperty(customProperties, booleanPropKey, newBooleanPropValue)).toEqual({
        ...customProperties,
        [booleanPropKey]: newBooleanPropValue,
      });
    });
  });
});
