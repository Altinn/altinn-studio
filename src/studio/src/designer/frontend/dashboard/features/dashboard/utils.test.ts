import {
  getUidFilter,
  getReposLabel,
  mergeRepos,
} from 'features/dashboard/utils';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import { Organizations } from 'services/organizationApi';

const language = {
  dashboard: {
    all_apps: 'all apps',
    my_apps: 'my apps',
    apps: 'apps',
  },
};

const orgs: Organizations = [];

describe('Dashboard utils', () => {
  describe('getUidFilter', () => {
    it('should return undefined when selectedContext is All', () => {
      const result = getUidFilter({
        selectedContext: SelectedContextType.All,
        userId: 1,
      });

      expect(result).toBeUndefined();
    });

    it('should return userId when selectedContext is Self', () => {
      const result = getUidFilter({
        selectedContext: SelectedContextType.Self,
        userId: 1,
      });

      expect(result).toBe(1);
    });

    it('should return selectedContext when selectedContext is not All or Self', () => {
      const result = getUidFilter({
        selectedContext: 2,
        userId: 1,
      });

      expect(result).toBe(2);
    });
  });

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
});
