import * as texts from '@altinn-studio/language/src/nb.json';

export const localChanges = {
  getThreeDotsMenu: () => cy.findByRole('button', { name: texts['sync_header.gitea_menu'] }),
  getLocalChangesElement: () => cy.get('li').contains(texts['sync_header.local_changes']),
  getHeader: () => cy.findByRole('heading', { name: texts['sync_header.local_changes'] }),
  getDownloadChangesLink: () =>
    cy.findByRole('link', {
      name: texts['local_changes.modal_download_only_changed_button'],
    }),
  getDownloadAllLink: () =>
    cy.findByRole('link', { name: texts['local_changes_modal.download_all_button'] }),
  getDeleteChangesButton: () =>
    cy.findByRole('button', { name: texts['local_changes.modal_delete_button'] }),
  getConfirmRepoNameField: () =>
    cy.findByRole('textbox', {
      name: texts[
        ('local_changes.modal_delete_modal_textfield_label',
        { appName: Cypress.env('designerAppName') })
      ],
    }),
  getConfirmDeleteButton: () =>
    cy.findByRole('button', {
      name: texts['local_changes.modal_confirm_delete_button'],
    }),
};
