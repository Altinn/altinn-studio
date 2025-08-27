import { stringifyData } from './jsonUtils';

describe('jsonUtils', () => {
  describe('stringifyData', () => {
    it('Formats an object as Json when possible', () => {
      const data = { test: 'test' };
      const result = stringifyData(data);
      expect(result).toEqual(`{"test":"test"}`);
    });

    it('Returns the result of `data.toString()` when `data` is not stringifiable', () => {
      const data = { circularReference: {} };
      data.circularReference = data;
      const result = stringifyData(data);
      expect(result).toEqual('[object Object]');
    });
  });
});
