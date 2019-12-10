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
  [key: string]: IMenuItem[];
}

export const mainMenuSettings: IMainMenu = {
  menuType: 'Header',
  menuItems: [
    {
      displayText: 'Om',
      activeSubHeaderSelection: 'Om',
      navLink: '/about',
      menuType: 'about',
    },
    {
      displayText: 'Lage',
      activeSubHeaderSelection: 'Lage',
      navLink: '/ui-editor',
      menuType: 'create',
    },
    {
      displayText: 'Språk',
      activeSubHeaderSelection: 'Språk',
      navLink: '/texts',
      menuType: 'language',
    },
  ],
};

export const leftDrawerMenuSettings: IDrawerMenu = {
  about: [
    {
      displayText: 'Om appen',
      navLink: '/about',
      activeLeftMenuSelection: 'Om appen',
      iconClass: 'fa fa-info-circle',
    },
    {
      displayText: 'Roller og rettigheter',
      navLink: '/rolesandrights',
      activeLeftMenuSelection: 'Roller og rettigheter',
      iconClass: 'fa fa-others',
    },
    {
      displayText: 'Historikk',
      navLink: '/versionhistory',
      activeLeftMenuSelection: 'Versjonshistorikk',
      iconClass: 'fa fa-deadline',
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
      displayText: 'UI-Editor',
      navLink: '/ui-editor',
      activeLeftMenuSelection: 'UI-Editor',
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
    {
      displayText: 'Tilgangsstyring',
      navLink: '/accesscontrol',
      activeLeftMenuSelection: 'Tilgangsstyring',
      iconClass: 'fa fa-info-circle',
    },
  ],
  language: [
    {
      displayText: 'Tekster',
      navLink: '/texts',
      activeLeftMenuSelection: 'Tekster',
      iconClass: 'fa fa-settings',
    },
    {
      displayText: 'Flere språk',
      navLink: '/translate',
      activeLeftMenuSelection: 'Flere språk',
      iconClass: 'fa fa-settings',
    },
  ],
};
