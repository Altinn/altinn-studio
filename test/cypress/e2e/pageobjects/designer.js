//Selectors in designer
export const designer = {
  appMenu: {
    about: "a[href='#/about']",
    edit: "a[href='#/edit']",
    texts: "a[href='#/texts']",
    deploy: "a[href='#/deploy']",
  },
  olderBuilds: 'Tidligere bygg av applikasjonen',
  inprogressSpinner: "[role='progressbar']",
  failedCheck: "i[class*='ai-circle-exclamation']",
  successCheck: "i[class*='ai-check-circle']",
  deployHistory: {
    at22: '#deploy-history-table-at22',
    prod: '#deploy-history-table-production',
  },
  aboutApp: {
    appName: '#administrationInputServicename_textField',
    appDescription: '#administrationInputDescription_textField',
    appHeader: '#altinn-column-layout-header',
    repoName: '#administrationInputReponame',
  },
  syncApp: {
    pull: '#fetch_changes_btn',
    push: '#changes_to_share_btn',
    noChanges: '#no_changes_to_share_btn',
    pushButton: '#share_changes_modal_button',
  },
  deleteChanges: {
    reset: '#reset-repo-button',
    name: '#delete-repo-name',
    confirm: '#confirm-reset-repo-button',
  },
  sideMenu: '#altinn-column-layout-side-menu',
  layOutContainer: '#altinn-column-layout-container',
  appEditorMenu: {
    datamodel: "a[href='#/datamodel']",
    uiEditor: "a[href='#/ui-editor']",
    accessControl: "a[href='#/accesscontrol']",
  },
  dragToArea: '.col-12',
  draggable: "div[draggable='true']",
  formComponents: {
    shortAnswer: "i[class^='fa fa-short-answer']",
    longAnswer: "i[class^='fa fa-long-answer']",
    checkBox: "i[class^='fa fa-checkbox']",
    radioDutton: "i[class^='fa fa-radio-button']",
    dropDown: "i[class^='fa fa-drop-down']",
    attachment: "i[class^='fa fa-attachment']",
    date: "i[class^='fa fa-date']",
    formButton: "i[class^='fa fa-button']",
  },
  deleteComponent: '.fa-circletrash',
};
