import React from 'react';
import { AltinnHeaderMenuItem } from 'app-shared/components/altinnHeaderMenu/AltinnHeaderMenu';
import { RepositoryType } from 'app-shared/types/global';
import { Link } from 'react-router-dom';
import { TFunction } from 'i18next';

export interface TopBarMenuItem {
  key: TopBarMenu;
  link: string;
  repositoryTypes: RepositoryType[];
}

export enum TopBarMenu {
  About = 'top_menu.about',
  Create = 'top_menu.create',
  Datamodel = 'top_menu.datamodel',
  Text = 'top_menu.texts',
  Preview = 'top_menu.preview',
  Deploy = 'top_menu.deploy',
  Access = 'top_menu.access-controll',
  None = '',
}

export const menu: TopBarMenuItem[] = [
  {
    key: TopBarMenu.About,
    link: '/:org/:app',
    repositoryTypes: [RepositoryType.App, RepositoryType.Datamodels],
  },
  {
    key: TopBarMenu.Create,
    link: '/:org/:app/ui-editor',
    repositoryTypes: [RepositoryType.App],
  },
  {
    key: TopBarMenu.Datamodel,
    link: '/:org/:app/datamodel',
    repositoryTypes: [RepositoryType.App, RepositoryType.Datamodels],
  },
  {
    key: TopBarMenu.Text,
    link: '/:org/:app/text-editor',
    repositoryTypes: [RepositoryType.App],
  },
];

export const getTopBarMenu = (
  org: string,
  app: string,
  repositoryType: RepositoryType,
  t: TFunction
): AltinnHeaderMenuItem[] => {
  return menu
    .filter((menuItem) => menuItem.repositoryTypes.includes(repositoryType))
    .map((item) => {
      return {
        key: item.key,
        link: <Link to={item.link.replace(':org', org).replace(':app', app)}>{t(item.key)} </Link>,
      } as AltinnHeaderMenuItem;
    });
};
