const subPathSettings = {
  about: [
    {
      displayText: 'Om appen',
      navLink: '/:org/:app/',
      activeLeftMenuSelection: 'Om appen',
      iconClass: 'fa fa-info-circle',
    },
  ],
  create: [
    {
      displayText: 'UI-Editor',
      navLink: '/:org/:app/ui-editor',
      activeLeftMenuSelection: 'UI-Editor',
      iconClass: 'fa fa-settings',
    },
    {
      displayText: 'Tilgangsstyring',
      navLink: '/:org/:app/accesscontrol',
      activeLeftMenuSelection: 'Access-Controll',
      iconClass: 'fa fa-keyhole',
    },
  ],
};
export default subPathSettings;
