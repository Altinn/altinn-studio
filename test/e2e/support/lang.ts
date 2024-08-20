export const changeToLang = (option: 'en' | 'nb') => {
  cy.findByRole('combobox', { name: option === 'en' ? 'Språk' : 'Language' }).click();
  cy.findByRole('option', { name: option === 'en' ? 'Engelsk' : 'Norwegian bokmål' }).click();

  // Verify that the language has changed
  cy.findByRole('combobox', { name: option === 'en' ? 'Language' : 'Språk' }).should('be.visible');
};
