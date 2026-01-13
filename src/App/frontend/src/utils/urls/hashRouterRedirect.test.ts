import { HashRouterRedirect } from 'src/utils/urls/hashRouterRedirect';

const org = 'ttd';
const app = 'frontend-test';

describe('HashRouterRedirect', () => {
  describe('hasHashRoute', () => {
    it('should return true when hash starts with #/', () => {
      expect(createRedirect('#/Task_1').hasHashRoute()).toBe(true);
    });

    it('should return false when hash is empty', () => {
      expect(createRedirect('').hasHashRoute()).toBe(false);
    });

    it('should return false for anchor-style hashes', () => {
      expect(createRedirect('#some-anchor').hasHashRoute()).toBe(false);
    });
  });

  describe('buildBrowserUrl', () => {
    it('should build correct URL for simple hash route', () => {
      expect(createRedirect('#/Task_1').buildBrowserUrl()).toBe('/ttd/frontend-test/Task_1');
    });

    it('should build correct URL for hash route with instance path', () => {
      expect(createRedirect('#/instance/12345/abc-def-123/Task_1').buildBrowserUrl()).toBe(
        '/ttd/frontend-test/instance/12345/abc-def-123/Task_1',
      );
    });

    it('should build correct URL for root hash route', () => {
      expect(createRedirect('#/').buildBrowserUrl()).toBe('/ttd/frontend-test/');
    });

    it('should preserve query parameters from hash', () => {
      expect(createRedirect('#/Task_1?lang=nb').buildBrowserUrl()).toBe('/ttd/frontend-test/Task_1?lang=nb');
    });

    it('should preserve query parameters from outside hash', () => {
      expect(createRedirect('#/Task_1', '?returnUrl=somewhere').buildBrowserUrl()).toBe(
        '/ttd/frontend-test/Task_1?returnUrl=somewhere',
      );
    });

    it('should merge query params with hash params taking priority', () => {
      expect(createRedirect('#/Task_1?lang=en', '?lang=nb').buildBrowserUrl()).toBe(
        '/ttd/frontend-test/Task_1?lang=en',
      );
    });

    it('should handle multiple query params in hash', () => {
      const url = createRedirect('#/Task_1?lang=nb&debug=true&page=1').buildBrowserUrl();
      expect(url).toContain('/ttd/frontend-test/Task_1?');
      expect(url).toContain('lang=nb');
      expect(url).toContain('debug=true');
      expect(url).toContain('page=1');
    });

    it('should combine query params from both URL and hash', () => {
      const url = createRedirect('#/Task_1?hashParam=value', '?urlParam=other').buildBrowserUrl();
      expect(url).toContain('hashParam=value');
      expect(url).toContain('urlParam=other');
    });
  });

  describe('execute', () => {
    it('should redirect and return true when hash route is present', () => {
      const location = createMockLocation('#/Task_1');
      const redirect = new HashRouterRedirect(location, org, app);

      expect(redirect.execute()).toBe(true);
      expect(location.replace).toHaveBeenCalledWith('/ttd/frontend-test/Task_1');
    });

    it('should not redirect and return false when no hash route', () => {
      const location = createMockLocation('');
      const redirect = new HashRouterRedirect(location, org, app);

      expect(redirect.execute()).toBe(false);
      expect(location.replace).not.toHaveBeenCalled();
    });

    it('should not redirect for anchor-style hashes', () => {
      const location = createMockLocation('#some-anchor');
      const redirect = new HashRouterRedirect(location, org, app);

      expect(redirect.execute()).toBe(false);
      expect(location.replace).not.toHaveBeenCalled();
    });
  });
});

function createMockLocation(hash: string, search: string = '') {
  return {
    hash,
    search,
    replace: jest.fn(),
  };
}

function createRedirect(hash: string, search: string = '') {
  return new HashRouterRedirect(createMockLocation(hash, search), org, app);
}
