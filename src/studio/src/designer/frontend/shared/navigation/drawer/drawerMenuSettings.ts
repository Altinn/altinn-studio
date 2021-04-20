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
  ],
  create: [
    {
      displayText: 'Datamodell',
      navLink: '/datamodel',
      activeLeftMenuSelection: 'Datamodell',
      iconClass: 'fa fa-archive',
    },
    // The following link is hidden until datamodelling page is ready for production.
    // {
    //   displayText: 'Data-Editor',
    //   navLink: '/datamodelling',
    //   activeLeftMenuSelection: 'Data-Editor',
    //   iconClass: 'fa fa-datamodel-object',
    // },
    {
      displayText: 'UI-Editor',
      navLink: '/ui-editor',
      activeLeftMenuSelection: 'UI-Editor',
      iconClass: 'fa fa-settings',
    },
    {
      displayText: 'Tilgangsstyring',
      navLink: '/accesscontrol',
      activeLeftMenuSelection: 'Tilgangsstyring',
      iconClass: 'fa fa-keyhole',
    },
  ],
  language: [
    {
      displayText: 'Tekster',
      navLink: '/texts',
      activeLeftMenuSelection: 'Tekster',
      iconClass: 'fa fa-write',
    },
  ],
};
