import * as texts from 'src/Designer/frontend/language/src/nb.json';

export const textEditor = {
  getNewTextButton: () => cy.findByRole('button', { name: texts['text_editor.new_text'] }),
};
