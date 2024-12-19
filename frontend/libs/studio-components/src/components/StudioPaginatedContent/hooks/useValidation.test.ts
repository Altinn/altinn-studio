import { useValidation } from './useValidation';

describe('useValidation', () => {
  it('should return true if the current page is valid', () => {
    const currentPage = 1;
    const validationRules = [false, true, false];
    const { isValid } = useValidation(currentPage, validationRules);
    expect(isValid).toBe(true);
  });

  it('should return false if the current page is not valid', () => {
    const currentPage = 0;
    const validationRules = [false, true, false];
    const { isValid } = useValidation(currentPage, validationRules);
    expect(isValid).toBe(false);
  });

  it('should return undefined if the current page is out of bounds', () => {
    const currentPage = 3;
    const validationRules = [false, true, false];
    const { isValid } = useValidation(currentPage, validationRules);
    expect(isValid).toBeUndefined();
  });
});
