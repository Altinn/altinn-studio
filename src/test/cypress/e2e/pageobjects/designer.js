//Sections in designer
export const appMenu = {
  about: "a[href='#/about']",
  edit: "a[href='#/edit']",
  texts: "a[href='#/texts']",
  deploy: "a[href='#/deploy']",
};

// App Build and deploy page
export const olderBuilds = 'Tidligere bygg av applikasjonen';
export const inprogressSpinner = "[role='progressbar']";
export const failedCheck = "i[class*='ai-circle-exclamation']";
export const successCheck = "i[class*='ai-check-circle']";

export const deployHistory ={
  at22: '#deploy-history-table-at22',
  prod: '#deploy-history-table-production',
};

//About app
export const aboutApp = {
  appName: '#administrationInputServicename_textField',
  appDescription: '#administrationInputDescription_textField',
  appHeader: '#altinn-column-layout-header',
  repoName: '#administrationInputReponame',
};

export const syncApp = {
  pull: '#fetch_changes_btn',
  push: '#changes_to_share_btn',
  noChanges: '#no_changes_to_share_btn',
  pushButton: '#share_changes_modal_button',
};

export const deleteChanges = {
  reset: '#reset-repo-button',
  name: '#delete-repo-name',
  confirm: '#confirm-reset-repo-button',
};

export const sideMenu = '#altinn-column-layout-side-menu';
export const layOutContainer= '#altinn-column-layout-container';

export const appEditorMenu = {
  datamodel: "a[href='#/datamodel']",
  uiEditor: "a[href='#/ui-editor']",
  accessControl: "a[href='#/accesscontrol']",
};

//UI components
export const dragToArea = '.col-12';
export const draggable = "div[draggable='true']";
export const formComponents = {
  shortAnswer: "i[class^='fa fa-short-answer']",
  longAnswer: "i[class^='fa fa-long-answer']",
  checkBox: "i[class^='fa fa-checkbox']",
  radioDutton: "i[class^='fa fa-radio-button']",
  dropDown: "i[class^='fa fa-drop-down']",
  attachment: "i[class^='fa fa-attachment']",
  date: "i[class^='fa fa-date']",
  formButton: "i[class^='fa fa-button']",
};

export const deleteComponent = '.fa-circletrash';
