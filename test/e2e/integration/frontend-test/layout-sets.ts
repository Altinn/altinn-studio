it('should be possible to render the app even if layout-sets are not configured', () => {
  // This test makes sure the fallback mechanism for missing layout-sets still works.
  // All of our test-apps have layout-sets configured, but there are many real apps that do not. For this reason
  // we intercept the request for layout-sets and simulates the responses of an app without layout-sets configured.
  cy.intercept('GET', '**/api/layoutsets', { statusCode: 204, body: '' });
  cy.intercept('GET', '**/api/resource/FormLayout.json', {
    statusCode: 302,
    headers: { location: '/ttd/frontend-test/api/layouts/message' },
  }).as('getLayout');
  cy.intercept('GET', '**/api/layoutsettings', {
    statusCode: 302,
    headers: { location: '/ttd/frontend-test/api/layoutsettings/message' },
  }).as('getLayoutSettings');
  cy.intercept('GET', '**/resource/RuleConfiguration.json', {
    statusCode: 302,
    headers: { location: '/ttd/frontend-test/api/ruleconfiguration/message' },
  }).as('getDynamics');

  cy.goto('message');

  // Wait for network to be idle
  cy.waitForNetworkIdle('*', '*', 500);

  cy.findByRole('heading', { name: /Appen for test av app frontend/i }).should('exist');

  // Assert that requests are fired once
  cy.get('@getLayout.all').should('have.length', 1);
  cy.get('@getLayoutSettings.all').should('have.length', 1);
  cy.get('@getDynamics.all').should('have.length', 1);
});
