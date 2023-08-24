import * as texts from '@altinn-studio/language/src/nb.json';

export const preview = {
  getBackToEditorButton: () =>
    cy.findByRole('button', {
      name: texts['top_menu.preview_back_to_editing'],
    }),
};
