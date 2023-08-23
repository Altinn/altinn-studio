import * as texts from '../../../../language/src/nb.json';
import * as testids from '../../../testids';

const getAllAppsHeader = () => cy.findByRole('heading', { name: texts['dashboard.all_apps'] });
const getUserAppsListHeader = () => cy.findByRole('heading', { name: texts['dashboard.my_apps'] });
const getFavouritesHeader = () => cy.findByRole('heading', { name: texts['dashboard.favourites'] });
const getSearchResultsHeader = () => cy.findByRole('heading', { name: texts['dashboard.search_result'] });
const getOrgAppsHeader = (org) => cy.findByRole('heading', { name: texts['dashboard.org_apps'].replace('{{orgName}}', org) });
const getUserAppsList = () => getUserAppsListHeader().next();
const getSearchResults = () => getSearchResultsHeader().next();
const getLinksCellForApp = (table, name) => table.findByRole('cell', { name }).siblings('div[data-field=\'links\']');

export const dashboard = {
  getAllAppsHeader,
  getAppOwnerField: () => cy.findByRole('combobox', { name: texts['general.service_owner'] }),
  getCancelButton: () => cy.findByRole('button', { name: texts['general.cancel'] }),
  getCreateAppButton: () => cy.findByRole('button', { name: texts['dashboard.create_service_btn'] }),
  getFavourites: () => getFavouritesHeader().next(),
  getFavouritesHeader,
  getLinksCellForSearchResultApp: (name) => getLinksCellForApp(getSearchResults(), name),
  getLinksCellForUserApp: (name) => getLinksCellForApp(getUserAppsList(), name),
  getNewAppLink: () => cy.findByRole('link', { name: texts['dashboard.new_service'] }),
  getOrgAppsHeader,
  getOrgOption: (org) => cy.findByRole('listbox').findByRole('option', { name: org }),
  getSavedNameField: () => cy.findByRole('textbox', { name: texts['general.service_name'] }),
  getSearchReposField: () => cy.findByTestId(testids.searchReposField),
  getSearchResults,
  getSearchResultsHeader,
  getStarAppButton: () => cy.findByRole('button', { name: texts['dashboard.star'] }),
  getUserAppsList,
  getUserAppsListHeader,
};
