import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

it('should be possible to render the app even if layout-sets are not configured', () => {
  // This test makes sure the fallback mechanism for missing layout-sets still works.
  // All of our test-apps have layout-sets configured, but there are many real apps that do not. For this reason
  // we intercept the request for layout-sets and simulates the responses of an app without layout-sets configured.
  cy.intercept('GET', '**/api/layoutsets', { statusCode: 204, body: '' });
  cy.intercept('GET', '**/api/resource/FormLayout.json', {
    statusCode: 302,
    headers: { location: '/ttd/frontend-test/api/layouts/message' },
  });

  cy.intercept('POST', `**/instances?instanceOwnerPartyId*`).as('createdInstance');
  cy.intercept('**/active', []).as('noActiveInstances');
  cy.startAppInstance(appFrontend.apps.frontendTest);
  cy.get(appFrontend.closeButton).should('be.visible');
  cy.get(appFrontend.message['header']).should('exist');
});
