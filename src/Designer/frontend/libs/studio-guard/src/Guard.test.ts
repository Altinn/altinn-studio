import { Guard } from './Guard';

describe('Guard', () => {
  describe('againstUndefined', () => {
    it('Throws when value is undefined', () => {
      expect(() => Guard.againstUndefined(undefined)).toThrow();
    });

    describe('Allows truthy values', () => {
      it.each([
        { type: 'boolean true', value: true },
        { type: 'integer', value: 42 },
        { type: 'decimal number', value: 4.2 },
        { type: 'negative number', value: -42 },
        { type: 'string', value: 'Hello' },
        { type: 'array', value: [1] },
        { type: 'object', value: { hello: 1 } },
      ])('Allows $type', ({ value }) => {
        expect(() => Guard.againstUndefined(value)).not.toThrow();
      });
    });

    describe('Allows defined falsy values', () => {
      it.each([
        { type: 'null', value: null },
        { type: 'boolean false', value: false },
        { type: 'zero', value: 0 },
        { type: 'Not-A-Number', value: NaN },
        { type: 'empty string', value: '' },
        { type: 'empty array', value: [] },
        { type: 'empty object', value: {} },
      ])('Allows $type', ({ value }) => {
        expect(() => Guard.againstUndefined(value)).not.toThrow();
      });
    });
  });

  describe('againstNull', () => {
    it('Throws when value is null', () => {
      expect(() => Guard.againstNull(null)).toThrow();
    });

    describe('Allows truthy values', () => {
      it.each([
        { type: 'boolean true', value: true },
        { type: 'integer', value: 42 },
        { type: 'decimal number', value: 4.2 },
        { type: 'negative number', value: -42 },
        { type: 'string', value: 'Hello' },
        { type: 'array', value: [1] },
        { type: 'object', value: { hello: 1 } },
      ])('Allows $type', ({ value }) => {
        expect(() => Guard.againstNull(value)).not.toThrow();
      });
    });

    describe('Allows falsy values that are not null', () => {
      it.each([
        { type: 'undefined', value: undefined },
        { type: 'boolean false', value: false },
        { type: 'zero', value: 0 },
        { type: 'Not-A-Number', value: NaN },
        { type: 'empty string', value: '' },
        { type: 'empty array', value: [] },
        { type: 'empty object', value: {} },
      ])('Allows $type', ({ value }) => {
        expect(() => Guard.againstNull(value)).not.toThrow();
      });
    });
  });

  describe('againstMissingProperty', () => {
    it('Throws when the given property is missing', () => {
      const obj: { prop1: number; prop2?: number } = { prop1: 1 };
      expect(() => Guard.againstMissingProperty(obj, 'prop2')).toThrow();
    });

    it('Allows the given property to be set', () => {
      const obj: { prop1: number; prop2?: number } = { prop1: 1, prop2: 2 };
      expect(() => Guard.againstMissingProperty(obj, 'prop2')).not.toThrow();
    });
  });

  describe('againstEmptyArray', () => {
    it('Throws when array is empty', () => {
      expect(() => Guard.againstEmptyArray([])).toThrow();
    });

    it('Allows non-empty arrays', () => {
      expect(() => Guard.againstEmptyArray([1])).not.toThrow();
      expect(() => Guard.againstEmptyArray([1, 2])).not.toThrow();
    });
  });

  describe('againstInvalidValue', () => {
    it('Throws when value is invalid', () => {
      expect(() => Guard.againstInvalidValue<string, 'abc'>('abc', 'abc')).toThrow();
    });

    it('Allows valid values', () => {
      expect(() => Guard.againstInvalidValue<string, 'def'>('abc', 'def')).not.toThrow();
    });
  });

  describe('AgainstNonJsonTypes', () => {
    it('Throws when file type is not json', () => {
      expect(() => Guard.againstNonJsonTypes('myFile.xsd')).toThrow();
    });

    it('Allows json files', () => {
      expect(() => Guard.againstNonJsonTypes('myFile.json')).not.toThrow();
    });
  });
});
