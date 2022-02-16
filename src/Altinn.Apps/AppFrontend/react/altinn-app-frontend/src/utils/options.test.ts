import { getOptionLookupKey } from "./options";

describe('utils > options', () => {
  describe('getOptionLookupKey', () => {
    it('should return id if no mapping is present', () => {
      const result = getOptionLookupKey('mockId');
      const expected = 'mockId';
      expect(result).toEqual(expected);
    });

    it('should return stringified object consisting of id and mapping if mapping if present', () => {
      const result = getOptionLookupKey('mockId', { someDataField: 'someUrlParam' });
      const expected = "{\"id\":\"mockId\",\"mapping\":{\"someDataField\":\"someUrlParam\"}}"
      expect(result).toEqual(expected);
    });
  });
})
