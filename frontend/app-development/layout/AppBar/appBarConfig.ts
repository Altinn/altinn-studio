import { RepositoryType } from 'app-shared/types/global';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { DatabaseIcon, Density3Icon, PencilIcon, TenancyIcon } from '@navikt/aksel-icons';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { TopBarMenu } from 'app-shared/enums/TopBarMenu';
import type { TopBarMenuItem } from 'app-shared/types/TopBarMenuItem';

export const topBarMenuItem: TopBarMenuItem[] = [
  {
    key: TopBarMenu.About,
    link: RoutePaths.Overview,
    repositoryTypes: [RepositoryType.App],
  },
  {
    key: TopBarMenu.Create,
    link: RoutePaths.UIEditor,
    icon: PencilIcon,
    repositoryTypes: [RepositoryType.App],
  },
  {
    key: TopBarMenu.Datamodel,
    link: RoutePaths.Datamodel,
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
    isBeta: true,
  },
];

export const getFilteredTopBarMenu = (repositoryType: RepositoryType): TopBarMenuItem[] => {
  return topBarMenuItem
    .filter((menuItem) => menuItem.repositoryTypes.includes(repositoryType))
    .filter(filterRoutesByFeatureFlag)
    .filter(filterRoutesByDatamodel);
};

const filterRoutesByFeatureFlag = (menuItem: TopBarMenuItem): boolean => {
  // If no feature tag is set, the menu item should be displayed
  if (!menuItem.featureFlagName) return true;

  return menuItem.featureFlagName && shouldDisplayFeature(menuItem.featureFlagName);
};

const filterRoutesByDatamodel = (menuItem: TopBarMenuItem) => {
  if (menuItem.repositoryTypes.includes(RepositoryType.Datamodels)) {
    return menuItem.key === TopBarMenu.Datamodel;
  }
  return true;
};
