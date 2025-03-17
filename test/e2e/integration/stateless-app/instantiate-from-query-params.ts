import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { getTargetUrl } from 'test/e2e/support/start-app-instance';

const appFrontend = new AppFrontend();

const prefilledValue = 'designer';

describe('Start stateless with query params', () => {
  beforeEach(() => {
    cy.visit(`${getTargetUrl('stateless-app')}/set-query-params?jobTitle=${prefilledValue}`);

    cy.intercept('**/api/layoutsettings/stateless').as('getLayoutStateless');
    cy.startAppInstance(appFrontend.apps.stateless);
    cy.wait('@getLayoutStateless');
    cy.get(appFrontend.stateless.name).should('exist').and('be.visible');
  });

  it('Prefill from query params', () => {
    cy.get('#instantiation-button-query-param').should('exist').click();
    cy.get(appFrontend.stateless.prefilledJobTitle).should('have.value', prefilledValue);
  });
});
