export interface IMenuItem {
  displayText: string;
  navLink: string;
  menuType?: string;
  activeLeftMenuSelection?: string;
  iconClass?: string;
  [key: string]: string;
}

export interface IMainMenu {
  menuType: string;
  menuItems: IMenuItem[];
}

export interface IDrawerMenu {
  language: IMenuItem[];
  [key: string]: IMenuItem[];
}

const mainMenuSettings: IMainMenu = {
  menuType: 'Header',
  menuItems: [
    {
      displayText: 'Språk',
      activeSubHeaderSelection: 'Språk',
      navLink: '/texts',
      menuType: 'language',
    },
  ],
};

export const createMainMenuSettings = (additionalOptions: IMenuItem[] = []): IMainMenu => ({
  ...mainMenuSettings,
  menuItems: [
    ...additionalOptions,
    ...mainMenuSettings.menuItems,
  ],
});

export const createLeftDrawerMenuSettings = (additionalOptions: { [key: string]: IMenuItem[] } = {}): IDrawerMenu => ({
  ...additionalOptions,
  ...leftDrawerMenuSettings,
});

const leftDrawerMenuSettings: IDrawerMenu = {
  language: [
    {
      displayText: 'Tekster',
      navLink: '/texts',
      activeLeftMenuSelection: 'Tekster',
      iconClass: 'fa fa-write',
    },
  ],
};
