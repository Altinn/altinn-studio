import * as texts from '@altinn-studio/language/src/nb.json';

export const administration = {
  getAppNameField: () => cy.findByRole('textbox', { name: texts['general.service_name'] }),
  getDescriptionField: () =>
    cy.findByRole('textbox', { name: texts['administration.service_comment'] }),
  getHeader: () => cy.findByRole('heading', { name: texts['administration.administration'] }),
};
