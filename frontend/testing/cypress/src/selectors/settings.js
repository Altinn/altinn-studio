import * as texts from '@altinn-studio/language/src/nb.json';

export const settings = {
  getAppNameField: () =>
    cy.findByRole('textbox', { name: texts['settings_modal.about_tab_name_label'] }),
  getCloseButton: () => cy.findByRole('button', { name: 'close modal' }),
};
