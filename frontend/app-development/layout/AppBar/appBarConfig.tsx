import React from 'react';
import { RepositoryType } from 'app-shared/types/global';
import { SupportedFeatureFlags, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { DatabaseIcon, Density3Icon, PencilIcon, TenancyIcon } from '@navikt/aksel-icons';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { TopBarMenu } from 'app-shared/enums/TopBarMenu';

export interface TopBarMenuNamesItem {
  key: TopBarMenu;
  link: RoutePaths;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  repositoryTypes: RepositoryType[];
  featureFlagName?: SupportedFeatureFlags;
}

export const menu: TopBarMenuNamesItem[] = [
  {
    key: TopBarMenu.About,
    link: RoutePaths.Overview,
    repositoryTypes: [RepositoryType.App, RepositoryType.Datamodels],
  },
  {
    key: TopBarMenu.Create,
    link: RoutePaths.UIEditor,
    icon: PencilIcon,
    repositoryTypes: [RepositoryType.App],
  },
  {
    key: TopBarMenu.Datamodel,
    link: RoutePaths.DataModel,
    icon: DatabaseIcon,
    repositoryTypes: [RepositoryType.App, RepositoryType.Datamodels],
  },
  {
    key: TopBarMenu.Text,
    link: RoutePaths.Text,
    icon: Density3Icon,
    repositoryTypes: [RepositoryType.App],
  },
  {
    key: TopBarMenu.ProcessEditor,
    link: RoutePaths.ProcessEditor,
    icon: TenancyIcon,
    repositoryTypes: [RepositoryType.App],
    featureFlagName: 'processEditor',
  },
];

export const getFilteredTopBarMenu = (repositoryType: RepositoryType): TopBarMenuNamesItem[] => {
  return menu
    .filter((menuItem) => menuItem.repositoryTypes.includes(repositoryType))
    .filter(filterRoutesByFeatureFlag);
};

const filterRoutesByFeatureFlag = (menuItem: TopBarMenuNamesItem): boolean => {
  // If no feature tag is set, the menu item should be displayed
  if (!menuItem.featureFlagName) return true;

  return menuItem.featureFlagName && shouldDisplayFeature(menuItem.featureFlagName);
};
