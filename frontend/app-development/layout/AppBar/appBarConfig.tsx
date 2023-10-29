import React from 'react';
import { AltinnHeaderMenuItem } from 'app-shared/components/altinnHeaderMenu/AltinnHeaderMenu';
import { RepositoryType } from 'app-shared/types/global';
import { Link } from 'react-router-dom';
import { TFunction } from 'i18next';
import { SupportedFeatureFlags, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { DatabaseIcon, Density3Icon, PencilIcon, TenancyIcon } from '@navikt/aksel-icons';
import { RoutePaths } from 'app-development/enums/RoutePaths';

export interface TopBarMenuItem {
  key: TopBarMenu;
  link: RoutePaths;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  repositoryTypes: RepositoryType[];
  featureFlagName?: SupportedFeatureFlags;
}

export enum TopBarMenu {
  About = 'top_menu.about',
  Create = 'top_menu.create',
  Datamodel = 'top_menu.datamodel',
  Text = 'top_menu.texts',
  Preview = 'top_menu.preview',
  Deploy = 'top_menu.deploy',
  Access = 'top_menu.access-controll',
  ProcessEditor = 'top_menu.process-editor',
  None = '',
}

export const menu: TopBarMenuItem[] = [
  {
    key: TopBarMenu.About,
    link: RoutePaths.About,
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

export const getTopBarMenu = (
  repositoryType: RepositoryType,
  t: TFunction,
): AltinnHeaderMenuItem[] => {
  return menu
    .filter((menuItem) => menuItem.repositoryTypes.includes(repositoryType))
    .filter(filterRoutesByFeatureFlag)
    .map((item) => {
      return {
        key: item.key,
        path: item.link,
        link: <Link to={item.link}>{t(item.key)} </Link>,
      } as AltinnHeaderMenuItem;
    });
};

const filterRoutesByFeatureFlag = (menuItem: TopBarMenuItem): boolean => {
  // If no feature tag is set, the menu item should be displayed
  if (!menuItem.featureFlagName) return true;

  return menuItem.featureFlagName && shouldDisplayFeature(menuItem.featureFlagName);
};
