import * as texts from '../../../../language/src/nb.json';
import * as testids from '../../../testids';

export const dashboard = {
  getAppOwnerField: () => cy.findByLabelText(texts['general.service_owner']),
  getCancelLink: () => cy.findByRole('link', { name: texts['general.cancel'] }),
  getCreateAppButton: () =>
    cy.findByRole('button', { name: texts['dashboard.create_service_btn'] }),
  getLinksCellForSearchResultApp: (name) => getLinksCellForApp(getSearchResults(), name),
  getNewAppLink: () => cy.findByRole('link', { name: texts['dashboard.new_service'] }),
  getSavedNameField: () => cy.findByRole('textbox', { name: texts['general.service_name'] }),
  getSearchReposField: () => cy.findByTestId(testids.searchReposField),
};
