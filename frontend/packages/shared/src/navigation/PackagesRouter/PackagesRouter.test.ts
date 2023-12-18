import { PackagesRouter } from './PackagesRouter';

const mockOrg: string = 'org';
const mockApp: string = 'app';

describe('PackagesRouter', () => {
  describe('constructor', () => {
    it('should default to empty strings if app and org are not provided', () => {
      const routerWithoutParams = new PackagesRouter({});
      expect(routerWithoutParams['app']).toEqual('');
      expect(routerWithoutParams['org']).toEqual('');
    });
  });

  describe('navigateToPackage', () => {
    it('should navigate to the correct "editor/overview page when the location parameter is set to "editorOverview"', () => {
      const packagesRouter = new PackagesRouter({ org: mockOrg, app: mockApp });
      const expectedUrl = `/editor/${mockOrg}/${mockApp}/overview`;

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
      const packagesRouter = new PackagesRouter({ org: mockOrg, app: mockApp });

      const mockQueryParams = '?layout=123';
      const expectedUrl = `/editor/${mockOrg}/${mockApp}/ui-editor${mockQueryParams}`;

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
      const packagesRouter = new PackagesRouter({ org: mockOrg, app: mockApp });
      const expectedUrl = `/editor/${mockOrg}/${mockApp}/deploy`;

      const result = packagesRouter.getPackageNavigationUrl('editorPublish');

      expect(result).toEqual(expectedUrl);
    });

    it('should return the correct URL for a package route without placeholders', () => {
      const packagesRouter = new PackagesRouter({ org: mockOrg, app: mockApp });
      const expectedUrl = '/dashboard';

      const result = packagesRouter.getPackageNavigationUrl('dashboard');

      expect(result).toEqual(expectedUrl);
    });
  });

  describe('replaceOrgAndApp', () => {
    it('should replace {{org}} and {{app}} placeholders in the given URL', () => {
      const packagesRouter = new PackagesRouter({ org: mockOrg, app: mockApp });

      const mockUrl = '/editor/{{org}}/{{app}}/overview';
      const expectedUrl = `/editor/${mockOrg}/${mockApp}/overview`;

      const result = packagesRouter['replaceOrgAndApp'](mockUrl);

      expect(result).toEqual(expectedUrl);
    });
  });
});
