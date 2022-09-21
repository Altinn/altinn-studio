export interface TopBarMenuItem {
  key: TopBarMenu;
  link: string;
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
  },
  {
    key: TopBarMenu.Create,
    link: '/ui-editor',
  },
  {
    key: TopBarMenu.Datamodel,
    link: '/datamodel'
  },
  {
    key: TopBarMenu.Text,
    link: '/texts',
  },
  {
    key: TopBarMenu.Deploy,
    link: '/deploy',
  },
];
