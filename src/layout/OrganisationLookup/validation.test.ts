import { checkValidOrgnNr } from 'src/layout/OrganisationLookup/validation';

describe('CheckValidOrgNr', () => {
  it('should return true when the orgNr is valid', () => {
    expect(checkValidOrgnNr('043871668')).toBe(true);
  });
  it('should return false when the orgNr is invalid', () => {
    expect(checkValidOrgnNr('143871668')).toBe(false);
  });
  it('should return false when the orgNr is too short', () => {
    expect(checkValidOrgnNr('12345678')).toBe(false);
  });
  it('should return false when the orgNr is too long', () => {
    expect(checkValidOrgnNr('1234567890')).toBe(false);
  });
});
