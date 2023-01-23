import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import type { Organizations } from '../../services/organizationApi';
import { getReposLabel, mergeRepos, validateRepoName } from './repoUtils';

const language = {
  'dashboard.all_apps': 'all apps',
  'dashboard.my_apps': 'my apps',
  'dashboard.apps': 'apps',
};

const orgs: Organizations = [];

describe('getReposLabel', () => {
  it('should return "all apps" when selectedContext is All', () => {
    const result = getReposLabel({
      selectedContext: SelectedContextType.All,
      language,
      orgs,
    });

    expect(result).toEqual('all apps');
  });

  it('should return "my apps" when selectedContext is Self', () => {
    const result = getReposLabel({
      selectedContext: SelectedContextType.Self,
      language,
      orgs,
    });

    expect(result).toEqual('my apps');
  });

  it('should return "org-id apps" when selectedContext is org.id', () => {
    const result = getReposLabel({
      selectedContext: 1,
      language,
      orgs: [
        {
          avatar_url: '',
          username: '',
          id: 1,
          full_name: 'org-id',
        },
      ],
    });

    expect(result).toEqual('org-id apps');
  });

  it('should return "apps" when selectedContext is org.id, and orgs array is empty', () => {
    const result = getReposLabel({
      selectedContext: 1,
      language,
      orgs: [],
    });

    expect(result).toEqual('apps');
  });
});

describe('mergeRepos', () => {
  const repoData = {
    name: 'repo',
    full_name: 'repo_fullname',
    owner: {
      avatar_url: 'url',
      login: 'login',
      full_name: 'full_name',
    },
    description: 'description',
    is_cloned_to_local: false,
    updated_at: 'today',
    html_url: 'html_url',
    clone_url: 'clone_url',
    user_has_starred: false,
  };

  it('should set user_has_starred to true when ids for repos in both lists match', () => {
    const result = mergeRepos({
      repos: [
        {
          ...repoData,
          id: 1,
        },
        {
          ...repoData,
          id: 2,
        },
      ],
      starredRepos: [
        {
          ...repoData,
          id: 2,
          user_has_starred: true,
        },
      ],
    });

    expect(result).toEqual([
      {
        ...repoData,
        id: 1,
        user_has_starred: false,
      },
      {
        ...repoData,
        id: 2,
        user_has_starred: true,
      },
    ]);
  });

  it('should return empty array when no repos are passed', () => {
    const result = mergeRepos({
      repos: undefined,
      starredRepos: undefined,
    });

    expect(result).toEqual([]);
  });

  it('should return original repos array when starred repos are undefined', () => {
    const repos = [
      {
        ...repoData,
        id: 1,
      },
      {
        ...repoData,
        id: 2,
      },
    ];

    const result = mergeRepos({
      repos,
      starredRepos: undefined,
    });

    expect(result).toEqual(repos);
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
