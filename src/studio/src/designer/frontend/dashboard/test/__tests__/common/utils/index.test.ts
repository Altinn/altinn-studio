import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import { validateRepoName, userHasAccessToSelectedContext } from 'common/utils';

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

describe('userHasAccessToSelectedContext', () => {
  it('should return true when context is self', () => {
    const result = userHasAccessToSelectedContext({
      selectedContext: SelectedContextType.Self,
      orgs: [],
    });

    expect(result).toBe(true);
  });

  it('should return true when context is all', () => {
    const result = userHasAccessToSelectedContext({
      selectedContext: SelectedContextType.All,
      orgs: [],
    });

    expect(result).toBe(true);
  });

  it('should return true when context id is present in orgs list', () => {
    const result = userHasAccessToSelectedContext({
      selectedContext: 1,
      orgs: [
        {
          avatar_url: 'avatar_url',
          description: '',
          full_name: 'full_name',
          id: 1,
          location: '',
          username: 'username',
          website: '',
        },
      ],
    });

    expect(result).toBe(true);
  });

  it('should return false when context id is not present in orgs list', () => {
    const result = userHasAccessToSelectedContext({
      selectedContext: 2,
      orgs: [
        {
          avatar_url: 'avatar_url',
          description: '',
          full_name: 'full_name',
          id: 1,
          location: '',
          username: 'username',
          website: '',
        },
      ],
    });

    expect(result).toBe(false);
  });
});
