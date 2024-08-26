import { CyHttpMessages } from 'cypress/types/net-stubbing';

import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import IncomingHttpResponse = CyHttpMessages.IncomingHttpResponse;
import type { IncomingApplicationMetadata } from 'src/features/applicationMetadata/types';

const appFrontend = new AppFrontend();

describe('Self identified user', () => {
  it('should be able to log in and create an instance', () => {
    testSelfIdentifiedUser();
  });

  it('should be able to log in and create an instance when only persons are allowed', () => {
    cy.intercept('GET', '**/api/v1/applicationmetadata', (req) => {
      req.on('response', (res: IncomingHttpResponse<IncomingApplicationMetadata>) => {
        res.body.partyTypesAllowed = {
          person: true,
          subUnit: false,
          bankruptcyEstate: false,
          organisation: false,
        };
      });
    });

    testSelfIdentifiedUser();
  });
});

function testSelfIdentifiedUser() {
  cy.intercept('**/active', []).as('noActiveInstances');
  cy.startAppInstance(appFrontend.apps.frontendTest, { user: 'selfIdentified', authenticationLevel: '0' });

  cy.get(appFrontend.closeButton).should('be.visible');
  cy.findByRole('heading', { name: /Appen for test av app frontend/i }).should('exist');

  cy.assertUser('selfIdentified');
}
