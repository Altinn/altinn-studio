import * as texts from '@altinn-studio/language/src/nb.json';

export const administrationTab = {
  getAppNameField: () =>
    cy.findByRole('textbox', { name: texts['settings_modal.about_tab_name_label'] }),
  getHeader: () => cy.findByRole('heading', { name: texts['settings_modal.about_tab_heading'] }),
};
