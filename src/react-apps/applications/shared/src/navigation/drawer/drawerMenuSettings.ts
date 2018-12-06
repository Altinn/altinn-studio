export interface IAltinnWindow extends Window {
  org: string;
  service: string;
  instanceId: string;
  reportee: string;
}

export const mainMenuSettings: any = {
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

export const leftDrawerMenuSettings: any = {
  about: [
    {
      displayText: 'Om tjenesten',
      navLink: '/aboutservice',
      activeLeftMenuSelection: 'aboutservice',
      iconName: 'information',
      items: [],
    },
    {
      displayText: 'Roller og rettigheter',
      navLink: '/rolesandrights',
      activeLeftMenuSelection: 'rolesandrights',
      iconName: 'settings',
      items: [],
    },
    {
      displayText: 'Produksjon',
      navLink: '/production',
      activeLeftMenuSelection: 'production',
      iconName: 'information',
      items: [],
    },
    {
      displayText: 'Versjonshistorikk',
      navLink: '/versionhistory',
      activeLeftMenuSelection: 'versionhistory',
      iconName: 'information',
      items: [],
    },
    {
      displayText: 'Om sluttbrukeren',
      navLink: '/aboutenduser',
      activeLeftMenuSelection: 'aboutenduser',
      iconName: 'information',
      items: [],
    },
    {
      displayText: 'Altinn.no',
      navLink: '/altinn',
      activeLeftMenuSelection: 'altinn',
      iconName: 'settings',
      items: [],
    },
  ],
  create: [
    {
      displayText: 'Datamodell',
      navLink: '/datamodel',
      activeLeftMenuSelection: 'datamodel',
      iconName: 'information',
      items: [],
    },
    {
      displayText: 'GUI',
      navLink: '/uieditor',
      activeLeftMenuSelection: 'gui',
      iconName: 'settings',
      items: [],
    },
    {
      displayText: 'API',
      navLink: '/api',
      activeLeftMenuSelection: 'api',
      iconName: 'information',
      items: [],
    },
  ],
  language: [
    {
      displayText: 'Tekst',
      navLink: '/text',
      activeLeftMenuSelection: 'text',
      iconName: 'information',
      items: [],
    },
    {
      displayText: 'Flere språk',
      navLink: '/translate',
      activeLeftMenuSelection: 'translate',
      iconName: 'settings',
      items: [],
    },
  ],
  test: [
    {
      displayText: 'test',
      navLink: '/test',
      activeLeftMenuSelection: 'test',
      iconName: 'information',
      items: [],
    },
  ],
  publish: [
    {
      displayText: 'Produksjonsette',
      navLink: '/productionsetting',
      activeLeftMenuSelection: 'productionsetting',
      iconName: 'information',
      items: [],
    },
    {
      displayText: 'Status',
      navLink: '/status',
      activeLeftMenuSelection: 'status',
      iconName: 'settings',
      items: [],
    },
  ],
};
