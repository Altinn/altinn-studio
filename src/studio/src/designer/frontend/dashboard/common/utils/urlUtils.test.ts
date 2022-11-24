import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { applicationAboutPage, getRepoEditUrl } from './urlUtils';

describe('urlUtils', () => {
  describe('applicationAboutPage', () => {
    it('should return url to about page', () => {
      const result = applicationAboutPage({
        org: 'org-name',
        repo: 'app-name',
      });

      expect(result).toEqual('http://localhost/editor/org-name/app-name/');
    });
  });

  describe('getRepoEditUrl', () => {
    it('should return url to datamodelling when repo name matches "<org>-datamodels"', () => {
      const result = getRepoEditUrl({
        org: 'org-name',
        repo: 'org-name-datamodels',
      });

      expect(result).toBe(`${APP_DEVELOPMENT_BASENAME}/org-name/org-name-datamodels/datamodel`);
    });

    it('should not return url to datamodelling when repo name does not match "<org>-datamodels"', () => {
      const result = getRepoEditUrl({
        org: 'org-name',
        repo: 'org-name-datamodels-not',
      });

      expect(result).not.toContain('#/datamodelling/');
      expect(result).toContain(APP_DEVELOPMENT_BASENAME);
    });
  });
});
