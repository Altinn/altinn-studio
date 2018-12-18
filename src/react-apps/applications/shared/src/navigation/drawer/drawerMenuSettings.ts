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
      navLink: '/aboutservice',
      menuType: 'about',
    },
    {
      displayText: 'Lage',
      navLink: '/uieditor',
      menuType: 'create',
    },
    {
      displayText: 'Språk',
      navLink: '/text',
      menuType: 'language',
    },
    {
      displayText: 'Test',
      navLink: '/test',
      menuType: 'test',
    },
    {
      displayText: 'Publisere',
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
      activeLeftMenuSelection: 'aboutservice',
      iconName: 'information',
    },
    {
      displayText: 'Roller og rettigheter',
      navLink: '/rolesandrights',
      activeLeftMenuSelection: 'rolesandrights',
      iconName: 'settings',
    },
    {
      displayText: 'Produksjon',
      navLink: '/production',
      activeLeftMenuSelection: 'production',
      iconName: 'information',
    },
    {
      displayText: 'Versjonshistorikk',
      navLink: '/versionhistory',
      activeLeftMenuSelection: 'versionhistory',
      iconName: 'information',
    },
    {
      displayText: 'Om sluttbrukeren',
      navLink: '/aboutenduser',
      activeLeftMenuSelection: 'aboutenduser',
      iconName: 'information',
    },
    {
      displayText: 'Altinn.no',
      navLink: '/altinn',
      activeLeftMenuSelection: 'altinn',
      iconName: 'settings',
    },
  ],
  create: [
    {
      displayText: 'Datamodell',
      navLink: '/datamodel',
      activeLeftMenuSelection: 'datamodel',
      iconName: 'information',
    },
    {
      displayText: 'GUI',
      navLink: '/uieditor',
      activeLeftMenuSelection: 'gui',
      iconName: 'settings',
    },
    {
      displayText: 'API',
      navLink: '/api',
      activeLeftMenuSelection: 'api',
      iconName: 'information',
    },
  ],
  language: [
    {
      displayText: 'Tekst',
      navLink: '/text',
      activeLeftMenuSelection: 'text',
      iconName: 'information',
    },
    {
      displayText: 'Flere språk',
      navLink: '/translate',
      activeLeftMenuSelection: 'translate',
      iconName: 'settings',
    },
  ],
  test: [
    {
      displayText: 'test',
      navLink: '/test',
      activeLeftMenuSelection: 'test',
      iconName: 'information',
    },
  ],
  publish: [
    {
      displayText: 'Produksjonsette',
      navLink: '/productionsetting',
      activeLeftMenuSelection: 'productionsetting',
      iconName: 'information',
    },
    {
      displayText: 'Status',
      navLink: '/status',
      activeLeftMenuSelection: 'status',
      iconName: 'settings',
    },
  ],
};
