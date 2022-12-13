import AppFrontend from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('WCAG', () => {
  it('WCAG test in stateless app', () => {
    cy.startAppInstance(appFrontend.apps.stateless);
    cy.get(appFrontend.stateless.name).should('exist').and('be.visible');
    cy.testWcag();
  });
});
