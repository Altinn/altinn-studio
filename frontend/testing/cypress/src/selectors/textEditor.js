import * as texts from '@altinn-studio/language/src/nb.json';

export const textEditor = {
  getNewTextButton: () => cy.findByRole('button', { name: texts['text_editor.new_text'] }),
};
