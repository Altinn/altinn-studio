import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import { getReposLabel, validateRepoName } from './repoUtils';
import { textMock } from '../../../testing/mocks/i18nMock';
import type { Organization } from 'app-shared/types/Organization';

const t = textMock;
const orgs: Organization[] = [];

describe('getReposLabel', () => {
  it('should return "all apps" when selectedContext is All', () => {
    const result = getReposLabel({
      selectedContext: SelectedContextType.All,
      t,
      orgs,
    });

    expect(result).toEqual(textMock('dashboard.all_apps'));
  });

  it('should return "my apps" when selectedContext is Self', () => {
    const result = getReposLabel({
      selectedContext: SelectedContextType.Self,
      t,
      orgs,
    });

    expect(result).toEqual(textMock('dashboard.my_apps'));
  });

  it('should return "org-id apps" when selectedContext is org.username', () => {
    const orgName = 'org-id';
    const result = getReposLabel({
      selectedContext: 'username1',
      t,
      orgs: [
        {
          avatar_url: '',
          username: 'username1',
          id: 1,
          full_name: orgName,
        },
      ],
    });

    expect(result).toEqual(textMock('dashboard.org_apps', { orgName }));
  });

  it('should return "apps" when selectedContext is org.username, and orgs array is empty', () => {
    const result = getReposLabel({
      selectedContext: 'username1',
      t,
      orgs: [],
    });

    expect(result).toEqual(textMock('dashboard.apps'));
  });
});

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
