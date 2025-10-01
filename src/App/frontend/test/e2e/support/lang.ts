export const changeToLang = (option: 'en' | 'nb') => {
  cy.findByRole('button', { name: option === 'en' ? 'Språkvalg' : 'Language' }).click();
  cy.findByRole('menuitemradio', { name: option === 'en' ? 'Engelsk' : 'Norwegian bokmål' }).click();

  // Verify that the language has changed
  cy.findByRole('button', { name: option === 'en' ? 'Language' : 'Språkvalg' }).should('be.visible');
};
