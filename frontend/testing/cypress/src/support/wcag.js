/// <reference types='cypress' />

Cypress.Commands.add('testWcag', () => {
  cy.injectAxe();
  cy.checkA11y(
    null,
    {
      includedImpacts: ['critical', 'serious', 'moderate'],
    },
    null,
    { skipFailures: true },
  );
});
