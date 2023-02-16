import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Anonymous (stateless) - Options', () => {
  it('should support fetching option list and changing its value', () => {
    cy.intercept('**/api/layoutsettings/stateless').as('getLayoutStateless');
    cy.startAppInstance(appFrontend.apps.anonymousStateless, true);
    cy.wait('@getLayoutStateless');

    const dropdownComponent = appFrontend.stateless.dropdown;

    cy.get(dropdownComponent).should('exist').and('be.visible');
    cy.get(dropdownComponent).should('have.value', '');

    cy.get(dropdownComponent).select('test@test.com');
    cy.get(dropdownComponent).should('have.value', 'test@test.com');
  });
});
