import { RepositoryType } from 'app-shared/types/global';
import { getFilteredTopBarMenu, topBarMenuItem } from './appBarConfig';
import { typedLocalStorage } from '@studio/components/src/hooks/webStorage';
import { TopBarMenu } from 'app-shared/enums/TopBarMenu';
import type { TopBarMenuItem } from 'app-shared/types/TopBarMenuItem';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { DatabaseIcon } from '@studio/icons';

describe('getTopBarMenu', () => {
  it('should return all items when provided repository type is "App" which is not hidden behind feature-flags', () => {
    const menuLength = topBarMenuItem.filter((menuItem) => !menuItem.featureFlagName).length;
    expect(getFilteredTopBarMenu(RepositoryType.App)).toHaveLength(menuLength);
  });

  it('Should only return the data model menu item when the provided repo type is "DataModels"', () => {
    const expected: TopBarMenuItem[] = [
      {
        key: TopBarMenu.DataModel,
        link: RoutePaths.DataModel,
        icon: DatabaseIcon,
        repositoryTypes: [RepositoryType.App, RepositoryType.DataModels],
      },
    ];

    expect(getFilteredTopBarMenu(RepositoryType.DataModels)).toEqual(expected);
  });

  it('should return empty list when provided repo type is "Unknown"', () => {
    const expected: TopBarMenuItem[] = [];

    expect(getFilteredTopBarMenu(RepositoryType.Unknown)).toEqual(expected);
  });

  it('should return menu items including items hidden behind feature flag, if the flag i activated', () => {
    typedLocalStorage.setItem('featureFlags', []); // Add the flags in the array when you want to test it
    expect(getFilteredTopBarMenu(RepositoryType.App)).toHaveLength(topBarMenuItem.length);
  });
});
