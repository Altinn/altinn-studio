/// <reference types='cypress' />

Cypress.Commands.add('testWcag', () => {
  cy.log('Testing WCAG');
  cy.injectAxe();
  cy.checkA11y(
    null,
    {
      includedImpacts: ['critical', 'serious', 'moderate'],
    }
  );
});
