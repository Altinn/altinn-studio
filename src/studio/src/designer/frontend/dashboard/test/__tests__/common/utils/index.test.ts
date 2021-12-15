import { validateRepoName } from 'common/utils';

describe('validateRepoName', () => {
  it('should return true when repo name does not contain invalid characters', () => {
    expect(validateRepoName('repo')).toBe(true);
  });

  it('should return false when repo name containes uppercase letters', () => {
    expect(validateRepoName('REPO')).toBe(false);
  });

  it('should return true when repo name contains "datamodels"', () => {
    expect(validateRepoName('my-datamodels')).toBe(true);
    expect(validateRepoName('datamodels-my')).toBe(true);
  });

  it('should return false when repo name is "datamodels"', () => {
    expect(validateRepoName('datamodels')).toBe(false);
  });

  it('should return false when repo name starts with invalid characters', () => {
    expect(validateRepoName('1-repo')).toBe(false);
    expect(validateRepoName('-repo')).toBe(false);
    expect(validateRepoName('*repo')).toBe(false);
  });

  it('should return false when repo name ends with invalid characters', () => {
    expect(validateRepoName('repo-')).toBe(false);
    expect(validateRepoName('repo*')).toBe(false);
  });

  it('should return true when length is 30 characters', () => {
    expect(validateRepoName('a23456789012345678901234567890')).toBe(true);
  });

  it('should return false when length is more than 30 characters', () => {
    expect(validateRepoName('a234567890123456789012345678901')).toBe(false);
  });
});
