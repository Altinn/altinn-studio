import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { getAppDevelopmentRootRoute, getRepoEditUrl } from './';

describe('urlUtils', () => {
  describe('applicationAboutPage', () => {
    it('should return url to about page', () => {
      const result = getAppDevelopmentRootRoute({
        org: 'org-name',
        repo: 'app-name',
      });

      expect(result).toEqual('http://localhost/editor/org-name/app-name/');
    });
  });

  describe('getRepoEditUrl', () => {
    it('should return url to dataModelling when repo name matches "<org>-datamodels"', () => {
      const result = getRepoEditUrl({
        org: 'org-name',
        repo: 'org-name-datamodels',
      });

      expect(result).toBe(`${APP_DEVELOPMENT_BASENAME}/org-name/org-name-datamodels/data-model`);
    });

    it('should not return url to dataModelling when repo name does not match "<org>-dataModels"', () => {
      const result = getRepoEditUrl({
        org: 'org-name',
        repo: 'org-name-data-models-not',
      });

      expect(result).not.toContain('#/datamodel/');
      expect(result).toContain(APP_DEVELOPMENT_BASENAME);
    });
  });
});
