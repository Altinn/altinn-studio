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
    link: '/:org/:app',
  },
  {
    key: TopBarMenu.Create,
    link: '/:org/:app/ui-editor',
  },
  {
    key: TopBarMenu.Datamodel,
    link: '/:org/:app/datamodel',
  },
  {
    key: TopBarMenu.Text,
    link: '/:org/:app/texts',
  },
  {
    key: TopBarMenu.Deploy,
    link: '/:org/:app/deploy',
  },
];
