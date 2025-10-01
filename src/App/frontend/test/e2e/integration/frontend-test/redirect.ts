import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Redirect', () => {
  beforeEach(() => {
    cy.intercept('**/active', []).as('noActiveInstances');
  });

  it('User missing role to start the app is displayed', () => {
    cy.allowFailureOnEnd();
    cy.intercept('POST', `**/instances?instanceOwnerPartyId*`, {
      statusCode: 403,
    }).as('instantiate');
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.instanceErrorCode).should('have.text', 'Feil 403');
    cy.get(appFrontend.altinnError).should('contain.text', texts.missingRights);

    // Verify that the mutation was only called once
    cy.get('@instantiate.all').should('have.length', 1);
  });

  it('User is redirected to unknown error page when a network call fails', () => {
    cy.allowFailureOnEnd();
    cy.intercept('GET', `**/applicationmetadata`, {
      statusCode: 401,
    }).as('getAppMetadata');
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.instanceErrorCode).should('have.text', 'Ukjent feil');
    cy.get(appFrontend.altinnError).should('contain.text', texts.tryAgain);

    // Verify that we didn't retry
    cy.get('@getAppMetadata.all').should('have.length', 1);
  });
});
