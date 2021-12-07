import { getRepoUrl } from 'common/utils/repoListUtils';

describe('repoListUtils', () => {
  describe('getRepoUrl', () => {
    it('should return url to datamodelling when repo name ends with "-datamodels"', () => {
      const result = getRepoUrl({
        repoFullName: 'this-repo-has-datamodels',
      });

      expect(result).not.toContain('/designer/');
      expect(result).toContain('#/datamodelling/');
    });

    it('should not return url to datamodelling when repo name does not end with "-datamodels"', () => {
      const result = getRepoUrl({
        repoFullName: 'this-repo-has-datamodels-not',
      });

      expect(result).not.toContain('#/datamodelling/');
      expect(result).toContain('/designer/');
    });
  });
});
