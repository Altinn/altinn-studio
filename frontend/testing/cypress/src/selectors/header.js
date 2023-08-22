import * as texts from "@altinn-studio/language/src/nb.json";
import * as testids from '../../../testids';

const getMenuItem = (name) => cy.findByRole('menuitem', { name });

export const header = {
  getAvatar: () => cy.findByAltText(texts['shared.header_button_alt']),
  getCreateLink: () => cy.findByRole('link', { name: texts['top_menu.create'] }),
  getDatamodelLink: () => cy.findByRole('link', { name: texts['top_menu.datamodel'] }),
  getMenuItem,
  getMenuItemAll: () => getMenuItem(texts['shared.header_all']),
  getMenuItemLogout: () => getMenuItem(texts['shared.header_logout']),
  getMenuItemOrg: (org) => cy.findByTestId(testids.orgMenuItem(org)),
  getMenuItemUser: () => cy.findByTestId(testids.userMenuItem),
  getOpenRepoLink: () => cy.findByRole('link', { name: texts['dashboard.open_repository'] }),
  getProfileIcon: () => cy.findByAltText(texts['general.profile_icon']),
};
