import * as texts from '../../../../language/src/nb.json';

const getLinksCellForApp = (table, name) =>
  table.findByRole('cell', { name }).siblings("div[data-field='links']");
const getSearchResultsHeader = () =>
  cy.findByRole('heading', { name: texts['dashboard.search_result'] });
const getSearchResults = () => getSearchResultsHeader().next();

export const dashboard = {
  getAppOwnerField: () => cy.findByLabelText(texts['general.service_owner']),
  getCreateAppButton: () =>
    cy.findByRole('button', { name: texts['dashboard.create_service_btn'] }),
  getLinksCellForSearchResultApp: (name) => getLinksCellForApp(getSearchResults(), name),
  getNewAppLink: () => cy.findByRole('link', { name: texts['dashboard.new_service'] }),
  getSavedNameField: () => cy.findByRole('textbox', { name: texts['general.service_name'] }),
  getSearchReposField: () => cy.findByRole('textbox', { name: texts['dashboard.search'] }),
};
