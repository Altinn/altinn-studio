import { getUidFilter, getReposLabel } from 'features/dashboard/utils';
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
  });
});
