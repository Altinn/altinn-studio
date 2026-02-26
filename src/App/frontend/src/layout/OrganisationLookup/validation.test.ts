import { checkValidOrgnNr } from 'src/layout/OrganisationLookup/validation';

describe('CheckValidOrgNr', () => {
  it('should return true when the orgNr is valid', () => {
    expect(checkValidOrgnNr('043871668')).toBe(true);
  });
  it('should return true when the orgNr is valid', () => {
    expect(checkValidOrgnNr('974683520')).toBe(true);
  });
  it('should return true when the orgNr is valid', () => {
    expect(checkValidOrgnNr('900010605')).toBe(true);
  });
  it('should return true when the orgNr is valid', () => {
    expect(checkValidOrgnNr('123778847')).toBe(true);
  });
  it('should return true when the orgNr is valid', () => {
    expect(checkValidOrgnNr('344547211')).toBe(true);
  });
  it('should return true when the orgNr is valid', () => {
    expect(checkValidOrgnNr('542683430')).toBe(true);
  });
  it('should return true when the orgNr is valid', () => {
    expect(checkValidOrgnNr('473324261')).toBe(true);
  });
  it('should return true when the orgNr is valid', () => {
    expect(checkValidOrgnNr('883863631')).toBe(true);
  });
  it('should return true when the orgNr is valid', () => {
    expect(checkValidOrgnNr('594027922')).toBe(true);
  });
  it('should return true when the orgNr is valid', () => {
    expect(checkValidOrgnNr('688701473')).toBe(true);
  });
  it('should return true when the orgNr is valid', () => {
    expect(checkValidOrgnNr('696902453')).toBe(true);
  });
  it('should return true when the orgNr is valid', () => {
    expect(checkValidOrgnNr('899350766')).toBe(true);
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
