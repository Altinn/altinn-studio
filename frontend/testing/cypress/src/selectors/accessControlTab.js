import * as texts from '@altinn-studio/language/src/nb.json';

export const accessControlTab = {
  getHeader: () =>
    cy.findByRole('heading', { name: texts['settings_modal.access_control_tab_heading'] }),
  getTab: () => cy.findByText(texts['settings_modal.access_control_tab_heading']),
  getBankruptcyParty: () =>
    cy.findByText(texts['settings_modal.access_control_tab_option_bankruptcy_estate']),
  getBankruptcyPartyCheckbox: () =>
    cy.findByRole('checkbox', {
      name: texts['settings_modal.access_control_tab_option_bankruptcy_estate'],
    }),
  getOrganisationParty: () =>
    cy.findByText(texts['settings_modal.access_control_tab_option_organisation']),
  getPersonParty: () => cy.findByText(texts['settings_modal.access_control_tab_option_person']),
  getSubUnitParty: () => cy.findByText(texts['settings_modal.access_control_tab_option_sub_unit']),
};
