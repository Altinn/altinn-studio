import * as texts from '@altinn-studio/language/src/nb.json';
import { orgMenuItem, userMenuItem, profileButton } from '../../../testids';
import { TopBarMenu } from '../../../../packages/shared/src/enums/TopBarMenu';

const getMenuItem = (name) => cy.findByRole('menuitem', { name });

export const header = {
  getAvatar: () => cy.findByAltText(texts['shared.header_button_alt']),
  getCreateLink: () =>
    cy.findByRole('banner').findByRole('link', { name: texts[TopBarMenu.Create] }),
  getDeployButton: () => cy.findByRole('link', { name: texts[TopBarMenu.Deploy] }),
  getMenuItem,
  getMenuItemAll: () => getMenuItem(texts['shared.header_all']),
  getMenuItemOrg: (org) => cy.findByTestId(orgMenuItem(org)),
  getMenuItemUser: () => cy.findByTestId(userMenuItem),
  getOpenRepoLink: () => cy.findByRole('link', { name: texts['dashboard.open_repository'] }),
  getPreviewButton: () => cy.findByRole('link', { name: texts[TopBarMenu.Preview] }),
  getProfileIcon: () => cy.findByTestId(profileButton),
  getTextEditorLink: () => cy.findByRole('link', { name: texts[TopBarMenu.Text] }),
};
