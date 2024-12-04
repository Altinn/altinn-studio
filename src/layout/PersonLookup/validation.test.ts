import { checkValidSsn } from 'src/layout/PersonLookup/validation';

describe('checkValidSsn', () => {
  it('should return true with valid ssn', () => {
    expect(checkValidSsn('13014013525')).toBe(true);
  }),
    it('should return false with invalid ssn', () => {
      expect(checkValidSsn('11017512345')).toBe(false);
    }),
    it('should return true with a tenor user', () => {
      expect(checkValidSsn('66877400531')).toBe(true);
    });
});
