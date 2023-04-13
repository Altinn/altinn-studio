import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import { getInstanceIdRegExp } from 'src/utils/instanceIdRegExp';

const appFrontend = new AppFrontend();

describe('Receipt', () => {
  it('is possible to view simple receipt when auto delete is true', () => {
    cy.intercept('**/api/layoutsettings/stateless').as('getLayoutStateless');
    cy.startAppInstance(appFrontend.apps.stateless);
    cy.wait('@getLayoutStateless');
    cy.startStateFullFromStateless();
    cy.intercept('PUT', '**/process/next*').as('nextProcess');
    cy.get(appFrontend.sendinButton).click();
    cy.wait('@nextProcess').its('response.statusCode').should('eq', 200);
    cy.url().then((url) => {
      const maybeInstanceId = getInstanceIdRegExp().exec(url);
      const instanceId = maybeInstanceId ? maybeInstanceId[1] : 'instance-id-not-found';
      const baseUrl =
        Cypress.env('environment') === 'local'
          ? Cypress.config().baseUrl || ''
          : `https://ttd.apps.${Cypress.config('baseUrl')?.slice(8)}`;
      const requestUrl = `${baseUrl}/ttd/${appFrontend.apps.stateless}/instances/${instanceId}/process/next`;
      cy.getCookie('XSRF-TOKEN').then((xsrfToken) => {
        cy.request({
          method: 'PUT',
          url: requestUrl,
          headers: {
            'X-XSRF-TOKEN': xsrfToken?.value,
          },
        })
          .its('status')
          .should('eq', 200);
      });
      cy.get(appFrontend.receipt.container).should('contain.text', texts.securityReasons);
    });
  });
});
