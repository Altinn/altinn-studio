export interface IMenuItem {
  displayText: string;
  navLink: string;
  menuType?: string;
  activeLeftMenuSelection?: string;
  iconName?: string;
  [key: string]: string;
}

export interface IMainMenu {
  menuType: string;
  menuItems: IMenuItem[];
}

export interface IDrawerMenu {
  about: IMenuItem[];
  create: IMenuItem[];
  language: IMenuItem[];
  test: IMenuItem[];
  publish: IMenuItem[];
  [key: string]: IMenuItem[];
}

export const mainMenuSettings: IMainMenu = {
  menuType: 'Header',
  menuItems: [
    {
      displayText: 'Om',
      activeSubHeaderSelection: 'Om',
      navLink: '/aboutservice',
      menuType: 'about',
    },
    {
      displayText: 'Lage',
      activeSubHeaderSelection: 'Lage',
      navLink: '/uieditor',
      menuType: 'create',
    },
    {
      displayText: 'Språk',
      activeSubHeaderSelection: 'Språk',
      navLink: '/text',
      menuType: 'language',
    },
    {
      displayText: 'Test',
      activeSubHeaderSelection: 'Teste',
      navLink: '/test',
      menuType: 'test',
    },
    {
      displayText: 'Publisere',
      activeSubHeaderSelection: 'Publisere',
      navLink: '/publish',
      menuType: 'publish',
    },
  ],
};

export const leftDrawerMenuSettings: IDrawerMenu = {
  about: [
    {
      displayText: 'Om tjenesten',
      navLink: '/aboutservice',
      activeLeftMenuSelection: 'Om tjenesten',
      iconName: 'information',
    },
    {
      displayText: 'Roller og rettigheter',
      navLink: '/rolesandrights',
      activeLeftMenuSelection: 'Roller og rettigheter',
      iconName: 'settings',
    },
    {
      displayText: 'Produksjon',
      navLink: '/production',
      activeLeftMenuSelection: 'Produksjon',
      iconName: 'information',
    },
    {
      displayText: 'Versjonshistorikk',
      navLink: '/versionhistory',
      activeLeftMenuSelection: 'Versjonshistorikk',
      iconName: 'information',
    },
    {
      displayText: 'Om sluttbrukeren',
      navLink: '/aboutenduser',
      activeLeftMenuSelection: 'Om sluttbrukeren',
      iconName: 'information',
    },
    {
      displayText: 'Altinn.no',
      navLink: '/altinn',
      activeLeftMenuSelection: 'Altinn',
      iconName: 'settings',
    },
  ],
  create: [
    {
      displayText: 'Datamodell',
      navLink: '/datamodel',
      activeLeftMenuSelection: 'Datamodell',
      iconName: 'information',
    },
    {
      displayText: 'GUI',
      navLink: '/uieditor',
      activeLeftMenuSelection: 'GUI',
      iconName: 'settings',
    },
    {
      displayText: 'API',
      navLink: '/api',
      activeLeftMenuSelection: 'API',
      iconName: 'information',
    },
  ],
  language: [
    {
      displayText: 'Tekst',
      navLink: '/text',
      activeLeftMenuSelection: 'Tekst',
      iconName: 'information',
    },
    {
      displayText: 'Flere språk',
      navLink: '/translate',
      activeLeftMenuSelection: 'Flere språk',
      iconName: 'settings',
    },
  ],
  test: [
    {
      displayText: 'Test',
      navLink: '/test',
      activeLeftMenuSelection: 'Test',
      iconName: 'information',
    },
  ],
  publish: [
    {
      displayText: 'Produksjonsette',
      navLink: '/productionsetting',
      activeLeftMenuSelection: 'Produksjonsette',
      iconName: 'information',
    },
    {
      displayText: 'Status',
      navLink: '/status',
      activeLeftMenuSelection: 'Status',
      iconName: 'settings',
    },
  ],
};
