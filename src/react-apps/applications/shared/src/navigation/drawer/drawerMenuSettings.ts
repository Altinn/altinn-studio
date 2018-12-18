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
      iconClass: 'ai ai-info-circle',
    },
    {
      displayText: 'Roller og rettigheter',
      navLink: '/rolesandrights',
      activeLeftMenuSelection: 'rolesandrights',
      iconClass: 'ai ai-others',
    },
    {
      displayText: 'Produksjon',
      navLink: '/production',
      activeLeftMenuSelection: 'production',
      iconClass: 'ai ai-settings',
    },
    {
      displayText: 'Versjonshistorikk',
      navLink: '/versionhistory',
      activeLeftMenuSelection: 'versionhistory',
      iconClass: 'ai ai-deadline',
    },
    {
      displayText: 'Om sluttbrukeren',
      navLink: '/aboutenduser',
      activeLeftMenuSelection: 'aboutenduser',
      iconClass: 'ai ai-info-circle',
    },
    {
      displayText: 'Altinn.no',
      navLink: '/altinn',
      activeLeftMenuSelection: 'altinn',
      iconClass: 'ai ai-info-circle',
    },
  ],
  create: [
    {
      displayText: 'Datamodell',
      navLink: '/datamodel',
      activeLeftMenuSelection: 'datamodel',
      iconClass: 'ai ai-info-circle',
    },
    {
      displayText: 'GUI',
      navLink: '/uieditor',
      activeLeftMenuSelection: 'gui',
      iconClass: 'ai ai-settings',
    },
    {
      displayText: 'API',
      navLink: '/api',
      activeLeftMenuSelection: 'api',
      iconClass: 'ai ai-info-circle',
    },
  ],
  language: [
    {
      displayText: 'Tekst',
      navLink: '/text',
      activeLeftMenuSelection: 'text',
      iconClass: 'ai ai-settings',
    },
    {
      displayText: 'Flere språk',
      navLink: '/translate',
      activeLeftMenuSelection: 'translate',
      iconClass: 'ai ai-settings',
    },
  ],
  test: [
    {
      displayText: 'test',
      navLink: '/test',
      activeLeftMenuSelection: 'test',
      iconClass: 'ai ai-info-circle',
    },
  ],
  publish: [
    {
      displayText: 'Produksjonsette',
      navLink: '/productionsetting',
      activeLeftMenuSelection: 'productionsetting',
      iconClass: 'ai ai-settings',
    },
    {
      displayText: 'Status',
      navLink: '/status',
      activeLeftMenuSelection: 'status',
      iconClass: 'ai ai-info-circle',
    },
  ],
};
