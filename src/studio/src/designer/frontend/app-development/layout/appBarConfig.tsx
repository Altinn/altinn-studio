import { RepositoryType } from '../services/repositoryApi';

export interface TopBarMenuItem {
  key: TopBarMenu;
  link: string;
  repositoryTypes?: RepositoryType[];
}

export enum TopBarMenu {
  About = 'top_menu.about',
  Create = 'top_menu.create',
  Datamodel = 'top_menu.datamodel',
  Text = 'top_menu.texts',
  Deploy = 'top_menu.deploy',
  None = '',
}

export const menu: TopBarMenuItem[] = [
  {
    key: TopBarMenu.About,
    link: '/',
    repositoryTypes: [RepositoryType.App, RepositoryType.Datamodels],
  },
  {
    key: TopBarMenu.Create,
    link: '/ui-editor',
    repositoryTypes: [RepositoryType.App],
  },
  {
    key: TopBarMenu.Datamodel,
    link: '/datamodel',
    repositoryTypes: [RepositoryType.App, RepositoryType.Datamodels],
  },
  {
    key: TopBarMenu.Text,
    link: '/texts',
    repositoryTypes: [RepositoryType.App],
  },
  {
    key: TopBarMenu.Deploy,
    link: '/deploy',
    repositoryTypes: [RepositoryType.App],
  },
];

export const getTopBarMenu = (repositoryType?: RepositoryType) => {
  if (!repositoryType) {
    return menu;
  }

  return menu.filter((item) => item.repositoryTypes.includes(repositoryType));
};
