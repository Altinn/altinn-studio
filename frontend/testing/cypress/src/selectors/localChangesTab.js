import * as texts from '@altinn-studio/language/src/nb.json';

export const localChangesTab = {
  getHeader: () => cy.findByRole('heading', { name: texts['dashboard.local_changes'] }),
  getTab: () => cy.findByText(texts['dashboard.local_changes']),
  getDownloadChangesLink: () =>
    cy.findByRole('link', {
      name: texts['settings_modal.local_changes_tab_download_only_changed_button'],
    }),
  getDownloadAllLink: () =>
    cy.findByRole('link', { name: texts['settings_modal.local_changes_tab_download_all_button'] }),
  getDeleteChangesButton: () =>
    cy.findByRole('button', { name: texts['settings_modal.local_changes_tab_delete_button'] }),
  getConfirmRepoNameField: () =>
    cy.findByRole('textbox', {
      name: texts['settings_modal.local_changes_tab_delete_modal_textfield_label'],
    }),
  getConfirmDeleteButton: () =>
    cy.findByRole('button', {
      name: texts['settings_modal.local_changes_tab_delete_modal_delete_button'],
    }),
};
