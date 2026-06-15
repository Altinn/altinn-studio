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

  it('User with too low authentication level is redirected to step-up authentication instead of the error page', () => {
    cy.allowFailureOnEnd();

    cy.intercept('GET', '**/api/v1/applicationmetadata', (req) => {
      req.on('response', (res) => {
        if (res.body && typeof res.body === 'object') {
          res.body.onEntry = { show: 'new-instance' };
        }
      });
    });

    cy.intercept('POST', '**/instances**', {
      statusCode: 403,
      body: { RequiredAuthenticationLevel: 3 },
    }).as('instantiate');

    // Track the order in which the requests fire to assert cookie invalidation happens before step-up.
    const callOrder: string[] = [];

    cy.intercept('PUT', '**/api/authentication/invalidatecookie', (req) => {
      callOrder.push('invalidateCookie');
      req.reply({ statusCode: 200 });
    }).as('invalidateCookie');

    // The step-up sets window.location.href, which would put Cypress into "waiting for page load" indefinitely (the
    // real target is a cross-origin platform endpoint). Match ONLY the step-up (login hits the same endpoint but never
    // with acr_values) and 302 it to a static same-origin page so a load event fires and we stay on the app origin,
    // while still capturing the request to assert its URL.
    const baseUrl = Cypress.config('baseUrl');
    if (!baseUrl || typeof baseUrl !== 'string') {
      throw new Error('baseUrl is not configured');
    }
    const appOrigin = Cypress.env('type') === 'localtest' ? baseUrl : `https://ttd.apps.${new URL(baseUrl).host}`;
    cy.intercept(
      {
        method: 'GET',
        pathname: '/authentication/api/v1/authentication',
        query: { acr_values: 'idporten-loa-high' },
      },
      (req) => {
        callOrder.push('stepUp');
        req.reply({ statusCode: 302, headers: { location: `${appOrigin}/ttd/frontend-test/login.html` } });
      },
    ).as('stepUp');

    cy.startAppInstance(appFrontend.apps.frontendTest);

    cy.wait('@invalidateCookie');

    cy.wait('@stepUp').its('request.url').should('include', 'acr_values=idporten-loa-high');

    cy.then(() => {
      expect(callOrder).to.deep.equal(['invalidateCookie', 'stepUp']);
    });
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
