import { applicationAboutPage, getRepoEditUrl } from 'common/utils/urlUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';

describe('urlUtils', () => {
  describe('applicationAboutPage', () => {
    it('should return url to about page', () => {
      const result = applicationAboutPage({
        repoFullName: 'org-name/app-name',
      });

      expect(result).toEqual('http://localhost/editor/org-name/app-name#/');
    });
  });

  describe('getRepoEditUrl', () => {
    it('should return url to datamodelling when repo name ends with "-datamodels"', () => {
      const result = getRepoEditUrl({
        repoFullName: 'this-repo-has-datamodels',
      });

      expect(result).not.toContain(APP_DEVELOPMENT_BASENAME);
      expect(result).toContain('#/datamodelling/');
    });

    it('should not return url to datamodelling when repo name does not end with "-datamodels"', () => {
      const result = getRepoEditUrl({
        repoFullName: 'this-repo-has-datamodels-not',
      });

      expect(result).not.toContain('#/datamodelling/');
      expect(result).toContain(APP_DEVELOPMENT_BASENAME);
    });
  });
});
