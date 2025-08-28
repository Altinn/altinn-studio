import { PackagesRouter } from './PackagesRouter';
import { app, org } from '@studio/testing/testids';

describe('PackagesRouter', () => {
  describe('constructor', () => {
    it('should default to empty strings if app and org are not provided', () => {
      const routerWithoutParams = new PackagesRouter();
      expect(routerWithoutParams['app']).toEqual('');
      expect(routerWithoutParams['org']).toEqual('');
    });
  });

  describe('navigateToPackage', () => {
    it('should navigate to the correct "editor/overview page when the location parameter is set to "editorOverview"', () => {
      const packagesRouter = new PackagesRouter({ org, app });
      const expectedUrl = `/editor/${org}/${app}/overview`;

      // Mock the window.location.assign method
      const assignMock = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { assign: assignMock },
        writable: true,
      });

      packagesRouter.navigateToPackage('editorOverview');

      expect(assignMock).toHaveBeenCalledWith(expectedUrl);
    });

    it('should navigate to the correct URL and include queryParams', () => {
      const packagesRouter = new PackagesRouter({ org, app });

      const mockQueryParams = '?layout=123';
      const expectedUrl = `/editor/${org}/${app}/ui-editor${mockQueryParams}`;

      const assignMock = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { assign: assignMock },
        writable: true,
      });

      packagesRouter.navigateToPackage('editorUiEditor', mockQueryParams);

      expect(assignMock).toHaveBeenCalledWith(expectedUrl);
    });
  });

  describe('getPackageNavigationUrl', () => {
    it('should return the correct URL for a package route with placeholders', () => {
      const packagesRouter = new PackagesRouter({ org, app });
      const expectedUrl = `/editor/${org}/${app}/deploy`;

      const result = packagesRouter.getPackageNavigationUrl('editorPublish');

      expect(result).toEqual(expectedUrl);
    });

    it('should return the correct URL for a package route without placeholders', () => {
      const packagesRouter = new PackagesRouter({ org, app });
      const expectedUrl = '/dashboard';

      const result = packagesRouter.getPackageNavigationUrl('dashboard');

      expect(result).toEqual(expectedUrl);
    });

    it('should return the correct URL with query parameters', () => {
      const mockQueryParams = '?layout=123';
      const packagesRouter = new PackagesRouter({ org, app });
      const expectedUrl = `/editor/${org}/${app}/data-model${mockQueryParams}`;

      const result = packagesRouter.getPackageNavigationUrl('dataModel', mockQueryParams);

      expect(result).toEqual(expectedUrl);
    });
  });

  describe('replaceOrgAndApp', () => {
    it('should replace {{org}} and {{app}} placeholders in the given URL', () => {
      const packagesRouter = new PackagesRouter({ org, app });

      const mockUrl = '/editor/{{org}}/{{app}}/overview';
      const expectedUrl = `/editor/${org}/${app}/overview`;

      const result = packagesRouter['replaceOrgAndApp'](mockUrl);

      expect(result).toEqual(expectedUrl);
    });
  });
});
