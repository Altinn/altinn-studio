import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import type { CyUser } from 'test/e2e/support/auth';

import type { IParty } from 'src/types/shared';

const appFrontend = new AppFrontend();

function login(user: CyUser) {
  cy.url().then((url) => {
    const instanceSuffix = new URL(url).hash;
    const partyId = Cypress.env('signingPartyId');

    if (partyId) {
      // Intercepting party list to only return the party we want to use. This will be automatically used by
      // app-frontend when it starts.
      let correctParty: IParty | undefined = undefined;

      // The /parties request and /current request happen in parallel, so we need
      // to await the first request in order to use its value in the second intercept.
      let resolveParties: () => void;
      const partiesPromise = new Promise<void>((res) => {
        resolveParties = res;
      });

      cy.intercept(
        {
          method: 'GET',
          url: `**/api/v1/parties?allowedtoinstantiatefilter=true`,
          times: 1,
        },
        (req) => {
          req.on('response', (res) => {
            const parties = res.body as IParty[];
            correctParty = parties.find((party: IParty) => party.partyId == partyId);
            if (!correctParty) {
              throw new Error(`Could not find party with id ${partyId}`);
            }
            res.send([correctParty]);
            resolveParties();
          });
        },
      );
      cy.intercept(
        {
          method: 'GET',
          url: `**/api/authorization/parties/current?returnPartyObject=true`,
          times: 1,
        },
        (req) => {
          req.on('response', async (res) => {
            await partiesPromise;
            if (!correctParty) {
              throw new Error(`Could not find party with id ${partyId}`);
            }
            res.send(correctParty);
          });
        },
      );
    }

    cy.startAppInstance(appFrontend.apps.signingTest, { user, urlSuffix: instanceSuffix });

    // We need to reload after re-logging in when we already had a session, because the startAppInstance command
    // will not reload the page if we already are visiting the correct URL.
    instanceSuffix && cy.reloadAndWait();

    cy.assertUser(user);
  });
}

describe('Double signing', () => {
  beforeEach(() => {
    cy.intercept('**/active', []).as('noActiveInstances');
    cy.intercept('POST', `**/instances?instanceOwnerPartyId*`).as('createInstance');
  });

  it('accountant -> manager -> auditor', () => {
    login('accountant');

    cy.get(appFrontend.signingTest.incomeField).type('4567');

    cy.get(appFrontend.signingTest.submitButton).should('not.be.disabled').click();
    cy.get(appFrontend.signingTest.noAccessPanel).should('exist').and('be.visible');

    cy.snapshot('signing:accountant');

    login('manager');
    cy.get(appFrontend.signingTest.managerConfirmPanel).should('exist').and('be.visible');
    cy.get(appFrontend.signingTest.incomeSummary).should('contain.text', '4 567 000 NOK');

    cy.get(appFrontend.signingTest.signingButton).should('not.be.disabled').click();
    cy.get(appFrontend.signingTest.sentToAuditor).should('exist').and('be.visible');

    cy.snapshot('signing:manager');

    login('auditor');
    cy.get(appFrontend.signingTest.auditorConfirmPanel).should('exist').and('be.visible');
    cy.get(appFrontend.signingTest.incomeSummary).should('contain.text', '4 567 000 NOK');
    cy.get(appFrontend.signingTest.signingButton).should('not.be.disabled').click();
    cy.get(appFrontend.receipt.container).should('exist').and('be.visible');

    cy.snapshot('signing:auditor');
  });

  it('manager -> manager -> auditor', () => {
    login('manager');

    cy.get(appFrontend.signingTest.incomeField).type('4567');

    cy.get(appFrontend.signingTest.submitButton).should('not.be.disabled').click();
    cy.get(appFrontend.signingTest.managerConfirmPanel).should('exist').and('be.visible');
    cy.get(appFrontend.signingTest.incomeSummary).should('contain.text', '4 567 000 NOK');

    cy.get(appFrontend.signingTest.signingButton).should('not.be.disabled').click();
    cy.get(appFrontend.signingTest.sentToAuditor).should('exist').and('be.visible');

    login('auditor');
    cy.get(appFrontend.signingTest.auditorConfirmPanel).should('exist').and('be.visible');
    cy.get(appFrontend.signingTest.incomeSummary).should('contain.text', '4 567 000 NOK');
    cy.get(appFrontend.signingTest.signingButton).should('not.be.disabled').click();
    cy.get(appFrontend.receipt.container).should('exist').and('be.visible');
  });
});
