import { Guard } from './Guard';

describe('Guard', () => {
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

  describe('AgainstNonJsonTypes', () => {
    it('Throws when file type is not json', () => {
      expect(() => Guard.againstNonJsonTypes('myFile.xsd')).toThrow();
    });

    it('Allows json files', () => {
      expect(() => Guard.againstNonJsonTypes('myFile.json')).not.toThrow();
    });
  });
});
