import { getCookie } from 'common/utils/cookieUtils';

describe('cookieUtils', () => {
  describe('getCookie', () => {
    beforeEach(() => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
      });
    });

    afterEach(() => {
      document.cookie = '';
    });

    it('should return cookie value by cookie name when cookie exists', () => {
      document.cookie = 'my-cookie=cookie-value';
      const result = getCookie('my-cookie');

      expect(result).toEqual('cookie-value');
    });

    it('should return correct cookie value by cookie name when multiple cookies exists', () => {
      document.cookie =
        'my-cookie=cookie-value; another-cookie=another-cookie-value; third-cookie=third-cookie-value';
      const result = getCookie('another-cookie');

      expect(result).toEqual('another-cookie-value');
    });

    it('should return null when cookie does not exists', () => {
      const result = getCookie('my-cookie');

      expect(result).toBe(null);
    });
  });
});
