import * as texts from '@altinn-studio/language/src/nb.json';

export const administration = {
  getAppNameField: () => cy.findByRole('textbox', { name: texts['general.service_name'] }),
  getDescriptionField: () => cy.findByRole('textbox', { name: texts['overview.service_comment'] }),
  getHeader: () => cy.findByRole('heading', { name: texts['overview.administration'] }),
};
