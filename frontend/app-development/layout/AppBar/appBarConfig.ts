import { RepositoryType } from 'app-shared/types/global';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { DatabaseIcon, Density3Icon, PencilIcon, TenancyIcon } from '@studio/icons';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { TopBarGroup, TopBarMenu } from 'app-shared/enums/TopBarMenu';
import type { TopBarMenuGroup, TopBarMenuItem } from 'app-shared/types/TopBarMenuItem';

export const topBarMenuItem: TopBarMenuItem[] = [
  {
    key: TopBarMenu.About,
    link: RoutePaths.Overview,
    repositoryTypes: [RepositoryType.App],
    group: TopBarGroup.Overview,
  },
  {
    key: TopBarMenu.Create,
    link: RoutePaths.UIEditor,
    icon: PencilIcon,
    repositoryTypes: [RepositoryType.App],
    group: TopBarGroup.Tools,
  },
  {
    key: TopBarMenu.DataModel,
    link: RoutePaths.DataModel,
    icon: DatabaseIcon,
    repositoryTypes: [RepositoryType.App, RepositoryType.DataModels],
    group: TopBarGroup.Tools,
  },
  {
    key: TopBarMenu.Text,
    link: RoutePaths.Text,
    icon: Density3Icon,
    repositoryTypes: [RepositoryType.App],
    group: TopBarGroup.Tools,
  },
  {
    key: TopBarMenu.ProcessEditor,
    link: RoutePaths.ProcessEditor,
    icon: TenancyIcon,
    repositoryTypes: [RepositoryType.App],
    isBeta: true,
    group: TopBarGroup.Tools,
  },
];

export const getFilteredTopBarMenu = (repositoryType: RepositoryType): TopBarMenuItem[] => {
  return topBarMenuItem
    .filter((menuItem) => menuItem.repositoryTypes.includes(repositoryType))
    .filter(filterRoutesByFeatureFlag)
    .filter(filterRoutesByDataModel);
};

const filterRoutesByFeatureFlag = (menuItem: TopBarMenuItem): boolean => {
  // If no feature tag is set, the menu item should be displayed
  if (!menuItem.featureFlagName) return true;

  return menuItem.featureFlagName && shouldDisplayFeature(menuItem.featureFlagName);
};

const filterRoutesByDataModel = (menuItem: TopBarMenuItem) => {
  if (menuItem.repositoryTypes.includes(RepositoryType.DataModels)) {
    return menuItem.key === TopBarMenu.DataModel;
  }
  return true;
};

export const groupMenuItemsByGroup = (menuItems: TopBarMenuItem[]): TopBarMenuGroup[] => {
  const groups: { [key: string]: TopBarMenuGroup } = {};

  menuItems.forEach((item: TopBarMenuItem) => {
    if (!groups[item.group]) {
      groups[item.group] = { groupName: item.group, menuItems: [] };
    }
    groups[item.group].menuItems.push(item);
  });

  return Object.values(groups);
};
