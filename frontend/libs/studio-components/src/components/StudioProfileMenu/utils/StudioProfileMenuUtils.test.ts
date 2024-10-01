import { getTruncatedText } from './StudioProfileMenuUtils';

describe('StudioProfileMenuUtils', () => {
  describe('getTruncatedText', () => {
    it('should return an empty string if triggerButtonText is empty', () => {
      const result = getTruncatedText('');
      expect(result).toBe('');
    });

    it('should return the original text if triggerButtonText length is less than truncateAt', () => {
      const result = getTruncatedText('Hello', 10);
      expect(result).toBe('Hello');
    });

    it('should return truncated text with ellipsis if triggerButtonText length exceeds truncateAt', () => {
      const result = getTruncatedText('Hello World', 5);
      expect(result).toBe('Hello...');
    });

    it('should return the original text if truncateAt is not provided', () => {
      const result = getTruncatedText('Hello World');
      expect(result).toBe('Hello World');
    });

    it('should handle cases when truncateAt is undefined', () => {
      const result = getTruncatedText('Hello World', undefined);
      expect(result).toBe('Hello World');
    });
  });
});
