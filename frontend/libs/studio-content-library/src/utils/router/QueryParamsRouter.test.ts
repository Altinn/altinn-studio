import { QueryParamsRouterImpl } from './QueryParamsRouter';

describe('QueryParamsRouterImpl', () => {
  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = QueryParamsRouterImpl.getInstance();
      const instance2 = QueryParamsRouterImpl.getInstance();
      expect(instance1).toBe(instance2); // Check if both instances are the same
    });
  });

  describe('getCurrentRoute', () => {
    const router = QueryParamsRouterImpl.getInstance();

    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?currentLibraryRoute=myRoute',
        },
        writable: true,
      });
    });

    it('should return the correct currentLibraryRoute from query parameters', () => {
      const route = router.currentRoute;
      expect(route).toBe('myRoute');
    });
  });

  describe('navigate', () => {
    let pushStateSpy: jest.SpyInstance;
    const router = QueryParamsRouterImpl.getInstance();

    beforeEach(() => {
      pushStateSpy = jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
      Object.defineProperty(window, 'location', {
        value: {
          href: 'http://localhost/',
          search: '',
        },
        writable: true,
      });
    });

    afterEach(() => {
      pushStateSpy.mockRestore();
    });

    it('should update the currentLibraryRoute query parameter and call pushState', () => {
      const routeToNavigateTo = 'newRoute';
      router.navigate(routeToNavigateTo);

      expect(window.history.pushState).toHaveBeenCalledWith(
        null,
        '',
        '?currentLibraryRoute=newRoute',
      );
    });
  });
});
