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
      iconClass: 'fa fa-info-circle',
    },
    {
      displayText: 'Roller og rettigheter',
      navLink: '/rolesandrights',
      activeLeftMenuSelection: 'Roller og rettigheter',
      iconClass: 'fa fa-others',
    },
    {
      displayText: 'Produksjon',
      navLink: '/production',
      activeLeftMenuSelection: 'Produksjon',
      iconClass: 'fa fa-settings',
    },
    {
      displayText: 'Versjonshistorikk',
      navLink: '/versionhistory',
      activeLeftMenuSelection: 'Versjonshistorikk',
      iconClass: 'fa fa-deadline',
    },
    {
      displayText: 'Om sluttbrukeren',
      navLink: '/aboutenduser',
      activeLeftMenuSelection: 'Om sluttbrukeren',
      iconClass: 'fa fa-info-circle',
    },
    {
      displayText: 'Altinn.no',
      navLink: '/altinn',
      activeLeftMenuSelection: 'Altinn',
      iconClass: 'fa fa-info-circle',
    },
  ],
  create: [
    {
      displayText: 'Datamodell',
      navLink: '/datamodel',
      activeLeftMenuSelection: 'Datamodell',
      iconClass: 'fa fa-info-circle',
    },
    {
      displayText: 'GUI',
      navLink: '/uieditor',
      activeLeftMenuSelection: 'GUI',
      iconClass: 'fa fa-settings',
    },
    {
      displayText: 'API',
      navLink: '/api',
      activeLeftMenuSelection: 'API',
      iconClass: 'fa fa-info-circle',
    },
    {
      displayText: 'Kode',
      navLink: '/code',
      activeLeftMenuSelection: 'Kode',
      iconClass: 'fa fa-info-circle',
    },
  ],
  language: [
    {
      displayText: 'Tekst',
      navLink: '/text',
      activeLeftMenuSelection: 'Tekst',
      iconClass: 'fa fa-settings',
    },
    {
      displayText: 'Flere språk',
      navLink: '/translate',
      activeLeftMenuSelection: 'Flere språk',
      iconClass: 'fa fa-settings',
    },
  ],
  test: [
    {
      displayText: 'Test',
      navLink: '/test',
      activeLeftMenuSelection: 'Test',
      iconClass: 'fa fa-info-circle',
    },
    {
      displayText: 'Test i testmiljø',
      navLink: '/deploytotest',
      activeLeftMenuSelection: 'Test i testmiljø',
      iconClass: 'fa fa-integration-test',
    },
  ],
  publish: [
    {
      displayText: 'Produksjonsette',
      navLink: '/publish',
      activeLeftMenuSelection: 'Produksjonsette',
      iconClass: 'fa fa-settings',
    },
    {
      displayText: 'Status',
      navLink: '/status',
      activeLeftMenuSelection: 'Status',
      iconClass: 'fa fa-info-circle',
    },
  ],
};
