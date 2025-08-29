import { hasAriaLabel, hasAriaLabelledBy } from './labelUtils';

describe('labelUtils', () => {
  describe('hasAriaLabelledBy', () => {
    it('should return true when props contain a valid "aria-labelledby" string', () => {
      const props = { 'aria-labelledby': 'label-id' };
      expect(hasAriaLabelledBy(props)).toBe(true);
    });

    it('should return false when "aria-labelledby" is not a string', () => {
      const props = { 'aria-labelledby': 123 };
      expect(hasAriaLabelledBy(props)).toBe(false);
    });

    it('should return false when "aria-labelledby" is missing', () => {
      const props = {};
      expect(hasAriaLabelledBy(props)).toBe(false);
    });

    it('should return false when props is an empty object', () => {
      const props = {};
      expect(hasAriaLabelledBy(props)).toBe(false);
    });

    it('should return false when props contain unrelated keys', () => {
      const props = { 'aria-label': 'label', id: 'test-id' };
      expect(hasAriaLabelledBy(props)).toBe(false);
    });
  });
  describe('hasAriaLabel', () => {
    it('should return true when props contain a valid "aria-label" string', () => {
      const props = { 'aria-label': 'label-text' };
      expect(hasAriaLabel(props)).toBe(true);
    });

    it('should return false when "aria-label" is not a string', () => {
      const props = { 'aria-label': 123 };
      expect(hasAriaLabel(props)).toBe(false);
    });

    it('should return false when "aria-label" is missing', () => {
      const props = {};
      expect(hasAriaLabel(props)).toBe(false);
    });

    it('should return false when props is an empty object', () => {
      const props = {};
      expect(hasAriaLabel(props)).toBe(false);
    });

    it('should return false when props contain unrelated keys', () => {
      const props = { 'aria-labelledby': 'label-id', id: 'test-id' };
      expect(hasAriaLabel(props)).toBe(false);
    });
  });
});
