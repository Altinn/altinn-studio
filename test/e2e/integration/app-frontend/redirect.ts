import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Common } from 'test/e2e/pageobjects/common';

const appFrontend = new AppFrontend();
const mui = new Common();

describe('Redirect', () => {
  beforeEach(() => {
    cy.intercept('**/active', []).as('noActiveInstances');
  });

  it('User missing role to start the app is displayed', () => {
    cy.intercept('POST', `**/instances?instanceOwnerPartyId*`, {
      statusCode: 403,
    });
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(mui.caption).should('have.text', 'Feil 403');
    cy.get(appFrontend.altinnError).should('contain.text', texts.missingRights);
  });

  it('User is redirected to unknown error page when a network call fails', () => {
    cy.intercept('GET', `**/applicationmetadata`, {
      statusCode: 401,
    });
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(mui.caption).should('have.text', 'Ukjent feil');
    cy.get(appFrontend.altinnError).should('contain.text', texts.tryAgain);
  });
});
