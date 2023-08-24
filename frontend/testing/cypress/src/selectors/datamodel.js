import * as texts from '../../../../language/src/nb.json';

export const datamodel = {
  getCreateNewButton: () =>
    cy.findByRole('button', {
      name: texts['app_data_modelling.landing_dialog_create'],
    }),
  getProperty: (name) => cy.findByRole('treeitem', { name }),
  getNameField: () => cy.findByRole('textbox', { name: texts['schema_editor.name'] }),
  getTypeField: () => cy.findByRole('combobox', { name: texts['schema_editor.type'] }),
};
