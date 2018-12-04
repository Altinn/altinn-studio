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
      navLink: '/about',
      menuType: 'about',
    },
    {
      displayText: 'Lage',
      navLink: '/uieditor',
      menuType: 'create',
    },
    {
      displayText: 'Språk',
      navLink: '/language',
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
      iconName: 'information',
      items: [],
    },
    {
      displayText: 'Roller og rettigheter',
      navLink: '/rolesandrights',
      iconName: 'settings',
      items: [],
    },
    {
      displayText: 'Produksjon',
      navLink: '/production',
      iconName: 'information',
      items: [],
    },
    {
      displayText: 'Versjonshistorikk',
      navLink: '/versionhistory',
      iconName: 'information',
      items: [],
    },
    {
      displayText: 'Om sluttbrukeren',
      navLink: '/aboutenduser',
      iconName: 'information',
      items: [],
    },
    {
      displayText: 'Altinn.no',
      navLink: '/altinn',
      iconName: 'settings',
      items: [],
    },
  ],
  create: [
    {
      displayText: 'Datamodell',
      navLink: '/datamodel',
      iconName: 'information',
      items: [],
    },
    {
      displayText: 'GUI',
      navLink: '/uieditor',
      iconName: 'settings',
      items: [],
    },
    {
      displayText: 'API',
      navLink: '/api',
      iconName: 'information',
      items: [],
    },
  ],
  language: [
    {
      displayText: 'Tekst',
      navLink: '/text',
      iconName: 'information',
      items: [],
    },
    {
      displayText: 'Flere språk',
      navLink: '/translate',
      iconName: 'settings',
      items: [],
    },
  ],
  test: [
    {
      displayText: 'test',
      navLink: '/test',
      iconName: 'information',
      items: [],
    },
  ],
  publish: [
    {
      displayText: 'Produksjonsette',
      navLink: '/productionsetting',
      iconName: 'information',
      items: [],
    },
    {
      displayText: 'Status',
      navLink: '/status',
      iconName: 'settings',
      items: [],
    },
  ],
};
