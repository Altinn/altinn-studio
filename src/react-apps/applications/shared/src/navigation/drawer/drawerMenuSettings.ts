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
      iconClass: 'ai ai-info-circle',
    },
    {
      displayText: 'Roller og rettigheter',
      navLink: '/rolesandrights',
      activeLeftMenuSelection: 'Roller og rettigheter',
      iconClass: 'ai ai-others',
    },
    {
      displayText: 'Produksjon',
      navLink: '/production',
      activeLeftMenuSelection: 'Produksjon',
      iconClass: 'ai ai-settings',
    },
    {
      displayText: 'Versjonshistorikk',
      navLink: '/versionhistory',
      activeLeftMenuSelection: 'Versjonshistorikk',
      iconClass: 'ai ai-deadline',
    },
    {
      displayText: 'Om sluttbrukeren',
      navLink: '/aboutenduser',
      activeLeftMenuSelection: 'Om sluttbrukeren',
      iconClass: 'ai ai-info-circle',
    },
    {
      displayText: 'Altinn.no',
      navLink: '/altinn',
      activeLeftMenuSelection: 'Altinn',
      iconClass: 'ai ai-info-circle',
    },
  ],
  create: [
    {
      displayText: 'Datamodell',
      navLink: '/datamodel',
      activeLeftMenuSelection: 'Datamodell',
      iconClass: 'ai ai-info-circle',
    },
    {
      displayText: 'GUI',
      navLink: '/uieditor',
      activeLeftMenuSelection: 'GUI',
      iconClass: 'ai ai-settings',
    },
    {
      displayText: 'API',
      navLink: '/api',
      activeLeftMenuSelection: 'API',
      iconClass: 'ai ai-info-circle',
    },
    {
      displayText: 'Kode',
      navLink: '/code',
      activeLeftMenuSelection: 'Kode',
      iconClass: 'ai ai-info-circle',
    },
  ],
  language: [
    {
      displayText: 'Tekst',
      navLink: '/text',
      activeLeftMenuSelection: 'Tekst',
      iconClass: 'ai ai-settings',
    },
    {
      displayText: 'Flere språk',
      navLink: '/translate',
      activeLeftMenuSelection: 'Flere språk',
      iconClass: 'ai ai-settings',
    },
  ],
  test: [
    {
      displayText: 'Test',
      navLink: '/test',
      activeLeftMenuSelection: 'Test',
      iconClass: 'ai ai-info-circle',
    },
  ],
  publish: [
    {
      displayText: 'Produksjonsette',
      navLink: '/productionsetting',
      activeLeftMenuSelection: 'Produksjonsette',
      iconClass: 'ai ai-settings',
    },
    {
      displayText: 'Status',
      navLink: '/status',
      activeLeftMenuSelection: 'Status',
      iconClass: 'ai ai-info-circle',
    },
  ],
};
