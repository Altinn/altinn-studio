import { RepositoryType } from 'app-shared/types/global';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { type HeaderMenuItem } from '../../types/HeaderMenu/HeaderMenuItem';
import { HeaderMenuItemKey } from '../../enums/HeaderMenuItemKey';
import { type HeaderMenuGroup } from '../../types/HeaderMenu/HeaderMenuGroup';
import {
  BookIcon,
  DatabaseIcon,
  Density3Icon,
  PencilIcon,
  TenancyIcon,
  UploadIcon,
} from '@studio/icons';
import { RoutePaths } from '../../enums/RoutePaths';
import { HeaderMenuGroupKey } from '../../enums/HeaderMenuGroupKey';
import { type NavigationMenuSmallGroup } from '../../types/HeaderMenu/NavigationMenuSmallGroup';

export const topBarMenuItem: HeaderMenuItem[] = [
  {
    key: HeaderMenuItemKey.About,
    link: RoutePaths.Overview,
    repositoryTypes: [RepositoryType.App],
    group: HeaderMenuGroupKey.Overview,
  },
  {
    key: HeaderMenuItemKey.Create,
    link: RoutePaths.UIEditor,
    icon: PencilIcon,
    repositoryTypes: [RepositoryType.App],
    group: HeaderMenuGroupKey.Tools,
  },
  {
    key: HeaderMenuItemKey.DataModel,
    link: RoutePaths.DataModel,
    icon: DatabaseIcon,
    repositoryTypes: [RepositoryType.App, RepositoryType.DataModels],
    group: HeaderMenuGroupKey.Tools,
  },
  {
    key: HeaderMenuItemKey.Text,
    link: RoutePaths.Text,
    icon: Density3Icon,
    repositoryTypes: [RepositoryType.App],
    group: HeaderMenuGroupKey.Tools,
  },
  {
    key: HeaderMenuItemKey.ProcessEditor,
    link: RoutePaths.ProcessEditor,
    icon: TenancyIcon,
    repositoryTypes: [RepositoryType.App],
    group: HeaderMenuGroupKey.Tools,
  },
  {
    key: HeaderMenuItemKey.Deploy,
    link: RoutePaths.Deploy,
    icon: UploadIcon,
    repositoryTypes: [RepositoryType.App],
    group: HeaderMenuGroupKey.Other,
  },
  {
    key: HeaderMenuItemKey.ContentLibrary,
    link: RoutePaths.ContentLibrary,
    icon: BookIcon,
    repositoryTypes: [RepositoryType.App],
    group: HeaderMenuGroupKey.Tools,
    isBeta: true,
  },
];

export const getFilteredTopBarMenu = (repositoryType: RepositoryType): HeaderMenuItem[] => {
  return topBarMenuItem
    .filter((menuItem) => menuItem.repositoryTypes.includes(repositoryType))
    .filter(filterRoutesByFeatureFlag)
    .filter(filterRoutesByDataModel);
};

export const getTopBarMenuItems = (
  repositoryType: RepositoryType,
  repoOwnerIsOrg: boolean,
): HeaderMenuItem[] => {
  const filteredMenuItems: HeaderMenuItem[] = getFilteredTopBarMenu(repositoryType);
  return filterOutDeployItem(filteredMenuItems, repoOwnerIsOrg, repositoryType);
};

export const filterRoutesByFeatureFlag = (menuItem: HeaderMenuItem): boolean => {
  if (!menuItem.featureFlagName) return true;

  return menuItem.featureFlagName && shouldDisplayFeature(menuItem.featureFlagName);
};

const filterRoutesByDataModel = (menuItem: HeaderMenuItem) => {
  if (menuItem.repositoryTypes.includes(RepositoryType.DataModels)) {
    return menuItem.key === HeaderMenuItemKey.DataModel;
  }
  return true;
};

const filterOutDeployItem = (
  menuItems: HeaderMenuItem[],
  repoOwnerIsOrg: boolean,
  repositoryType: RepositoryType,
): HeaderMenuItem[] => {
  return menuItems.filter((menuItem: HeaderMenuItem) => {
    if (menuItem.key === HeaderMenuItemKey.Deploy) {
      if (!repoOwnerIsOrg || repositoryType === RepositoryType.DataModels) return false;
    }
    return true;
  });
};

export const groupMenuItemsByGroup = (menuItems: HeaderMenuItem[]): HeaderMenuGroup[] => {
  const groups: { [key: string]: HeaderMenuGroup } = {};

  menuItems.forEach((item: HeaderMenuItem) => {
    if (!groups[item.group]) {
      groups[item.group] = { groupName: item.group, menuItems: [] };
    }
    groups[item.group].menuItems.push(item);
  });

  return Object.values(groups);
};

export const mapHeaderMenuGroupToNavigationMenu = (
  menuGroup: HeaderMenuGroup,
): NavigationMenuSmallGroup => ({
  name: menuGroup.groupName,
  showName: menuGroup.groupName === HeaderMenuGroupKey.Tools,
  items: menuGroup.menuItems.map((menuItem: HeaderMenuItem) => ({
    action: {
      type: 'link',
      href: menuItem.link,
    },
    name: menuItem.key,
    isBeta: menuItem.isBeta,
  })),
});

export const getFilteredMenuListForOverviewPage = (): HeaderMenuItem[] => {
  return getFilteredTopBarMenu(RepositoryType.App).filter(
    (item) => item.key !== HeaderMenuItemKey.About && item.key !== HeaderMenuItemKey.Deploy,
  );
};
