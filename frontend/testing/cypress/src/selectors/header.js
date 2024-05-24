import * as texts from '@altinn-studio/language/src/nb.json';
import { orgMenuItem, userMenuItem, profileButton } from '../../../testids';

const getMenuItem = (name) => cy.findByRole('menuitem', { name });

export const header = {
  getAvatar: () => cy.findByAltText(texts['shared.header_button_alt']),
  getCreateLink: () =>
    cy.findByRole('banner').findByRole('link', { name: texts['top_menu.create'] }),
  getDeployButton: () => cy.findByRole('link', { name: texts['top_menu.deploy'] }),
  getMenuItem,
  getMenuItemAll: () => getMenuItem(texts['shared.header_all']),
  getMenuItemOrg: (org) => cy.findByTestId(orgMenuItem(org)),
  getMenuItemUser: () => cy.findByTestId(userMenuItem),
  getOpenRepoLink: () => cy.findByRole('link', { name: texts['dashboard.open_repository'] }),
  getPreviewButton: () => cy.findByRole('link', { name: texts['top_menu.preview'] }),
  getProfileIcon: () => cy.findByTestId(profileButton),
  getTextEditorLink: () => cy.findByRole('link', { name: texts['top_menu.texts'] }),
};
