import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Redirect', () => {
  beforeEach(() => {
    cy.intercept('**/active', []).as('noActiveInstances');
  });

  describe('Instance creation errors', () => {
    it('User missing role (403) is redirected to error page', () => {
      cy.allowFailureOnEnd();

      // Mock the instance creation POST to return 403
      cy.intercept('POST', `**/instances?instanceOwnerPartyId*`, {
        statusCode: 403,
        body: { message: 'Forbidden' },
      }).as('instantiate');

      // Force new instance creation with query parameter
      cy.startAppInstance(appFrontend.apps.frontendTest, { urlSuffix: '?forceNew=true' });

      // Wait for the POST attempt
      cy.wait('@instantiate');

      // Verify redirect to error page with correct params
      cy.url().should('include', '/error');
      cy.url().should('include', 'errorType=instance_creation_failed');
      cy.url().should('include', 'statusCode=403');
      cy.url().should('include', 'showContactInfo=true');

      // Verify error content is displayed
      cy.get(appFrontend.altinnError).should('be.visible');
      cy.get(appFrontend.altinnError).should('contain.text', 'Du kan ikke starte denne tjenesten');

      // Verify contact info is shown
      cy.get(appFrontend.altinnError).should('contain.text', 'brukerservice');

      // Verify that the mutation was only called once (no retries)
      cy.get('@instantiate.all').should('have.length', 1);
    });

    it('Server error (500) is redirected to server error page', () => {
      cy.allowFailureOnEnd();

      cy.intercept('POST', `**/instances?instanceOwnerPartyId*`, {
        statusCode: 500,
        body: { message: 'Internal Server Error' },
      }).as('instantiate');

      cy.startAppInstance(appFrontend.apps.frontendTest, { urlSuffix: '?forceNew=true' });

      cy.wait('@instantiate');

      // Verify redirect with correct error type
      cy.url().should('include', '/error');
      cy.url().should('include', 'errorType=server_error');
      cy.url().should('include', 'statusCode=500');
      cy.url().should('include', 'showContactInfo=true');

      // Verify error content
      cy.get(appFrontend.altinnError).should('be.visible');
      cy.get(appFrontend.altinnError).should('contain.text', 'Ukjent feil');
      cy.get(appFrontend.altinnError).should('contain.text', 'prøv igjen senere');

      // Verify no retries
      cy.get('@instantiate.all').should('have.length', 1);
    });

    it('Network error is redirected to network error page', () => {
      cy.allowFailureOnEnd();

      // Simulate network failure
      cy.intercept('POST', `**/instances?instanceOwnerPartyId*`, {
        forceNetworkError: true,
      }).as('instantiate');

      cy.startAppInstance(appFrontend.apps.frontendTest, { urlSuffix: '?forceNew=true' });

      // The catch block will trigger
      cy.url().should('include', '/error');
      cy.url().should('include', 'errorType=network_error');
      cy.url().should('include', 'showContactInfo=false');

      // Verify error content
      cy.get(appFrontend.altinnError).should('be.visible');
      cy.get(appFrontend.altinnError).should('contain.text', 'Noe gikk galt');
    });
  });

  describe('Other error scenarios', () => {
    it('User is redirected to unknown error page when API call fails', () => {
      cy.allowFailureOnEnd();
      cy.ignoreConsoleMessages([/AxiosError: Request failed with status code 401/]);
      cy.intercept('GET', '**/api/**', {
        statusCode: 401,
      }).as('apiCall');
      cy.startAppInstance(appFrontend.apps.frontendTest);
      cy.get(appFrontend.instanceErrorCode).should('have.text', 'Ukjent feil');
    });
  });
});
