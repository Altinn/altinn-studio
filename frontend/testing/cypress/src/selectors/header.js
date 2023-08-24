import * as texts from '@altinn-studio/language/src/nb.json';
import * as testids from '../../../testids';

const getMenuItem = (name) => cy.findByRole('menuitem', { name });

export const header = {
  getAvatar: () => cy.findByAltText(texts['shared.header_button_alt']),
  getCreateLink: () => cy.findByRole('link', { name: texts['top_menu.create'] }),
  getDatamodelLink: () => cy.findByRole('link', { name: texts['top_menu.datamodel'] }),
  getDeployButton: () => cy.findByRole('button', { name: texts['top_menu.deploy'] }),
  getDescribeChangesField: () =>
    cy.findByRole('textbox', {
      name: texts['sync_header.describe_and_validate'],
    }),
  getMenuItem,
  getMenuItemAll: () => getMenuItem(texts['shared.header_all']),
  getMenuItemLogout: () => getMenuItem(texts['shared.header_logout']),
  getMenuItemOrg: (org) => cy.findByTestId(testids.orgMenuItem(org)),
  getMenuItemUser: () => cy.findByTestId(testids.userMenuItem),
  getOpenRepoLink: () => cy.findByRole('link', { name: texts['dashboard.open_repository'] }),
  getPreviewButton: () => cy.findByRole('button', { name: texts['top_menu.preview'] }),
  getProfileIcon: () => cy.findByAltText(texts['general.profile_icon']),
  getShareChangesButton: () =>
    cy.findByRole('button', { name: texts['sync_header.changes_to_share'] }),
  getSharedChangesSuccessMessage: () =>
    cy.findByText(texts['sync_header.sharing_changes_completed']),
  getTextEditorLink: () => cy.findByRole('link', { name: texts['top_menu.texts'] }),
  getValidateChangesButton: () =>
    cy.findByRole('button', { name: texts['general.validate_changes'] }),
};
