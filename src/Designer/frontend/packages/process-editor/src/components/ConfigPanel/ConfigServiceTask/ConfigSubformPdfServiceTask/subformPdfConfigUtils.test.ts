import { getRequiredSubformPdfValueErrorKey } from './subformPdfConfigUtils';

describe('getRequiredSubformPdfValueErrorKey', () => {
  it('requires a value', () => {
    expect(getRequiredSubformPdfValueErrorKey('')).toBe('validation_errors.required');
  });

  // The runtime uses IsNullOrWhitespace, so spaces are as missing as nothing at all.
  it('treats a value of only whitespace as missing', () => {
    expect(getRequiredSubformPdfValueErrorKey('   ')).toBe('validation_errors.required');
  });

  it('accepts a value it cannot verify, since only the app knows its own components', () => {
    expect(getRequiredSubformPdfValueErrorKey('my-subform')).toBeNull();
  });
});
