import { UrlUtils } from './UrlUtils';

describe('UrlUtils', () => {
  describe('extractLastRouterParam', () => {
    it('should return the last part of the pathname', () => {
      const pathname = '/home/user/profile';
      const result = UrlUtils.extractLastRouterParam(pathname);
      expect(result).toBe('profile');
    });

    it('should handle a single segment pathname', () => {
      const pathname = '/profile';
      const result = UrlUtils.extractLastRouterParam(pathname);
      expect(result).toBe('profile');
    });

    it('should return an empty string for an empty pathname', () => {
      const pathname = '';
      const result = UrlUtils.extractLastRouterParam(pathname);
      expect(result).toBe('');
    });
  });

  describe('extractSecondLastRouterParam', () => {
    it('should return the second last part of the pathname', () => {
      const pathname = '/home/user/profile';
      const result = UrlUtils.extractSecondLastRouterParam(pathname);
      expect(result).toBe('user');
    });

    it('should handle a single segment pathname', () => {
      const pathname = '/profile';
      const result = UrlUtils.extractSecondLastRouterParam(pathname);
      expect(result).toBe('');
    });

    it('should return an empty string for an empty pathname', () => {
      const pathname = '';
      const result = UrlUtils.extractSecondLastRouterParam(pathname);
      expect(result).toBe('');
    });
  });

  describe('extractThirdRouterParam', () => {
    it('should return the third part of the pathname', () => {
      const pathname = '/home/user/profile';
      const result = UrlUtils.extractThirdRouterParam(pathname);
      expect(result).toBe('profile');
    });

    it('should return the third part of the pathname when there are many segments', () => {
      const pathname = '/home/user/profile/details/123';
      const result = UrlUtils.extractThirdRouterParam(pathname);
      expect(result).toBe('profile');
    });

    it('should handle a single segment pathname', () => {
      const pathname = '/profile';
      const result = UrlUtils.extractThirdRouterParam(pathname);
      expect(result).toBe('');
    });

    it('should return an empty string for an empty pathname', () => {
      const pathname = '';
      const result = UrlUtils.extractThirdRouterParam(pathname);
      expect(result).toBe('');
    });
  });
});
