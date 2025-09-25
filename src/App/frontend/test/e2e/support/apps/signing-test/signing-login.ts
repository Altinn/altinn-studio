import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import type { CyUser } from 'test/e2e/support/auth';

import type { IParty } from 'src/types/shared';

export function signingTestLogin(user: CyUser) {
  const appFrontend = new AppFrontend();
  cy.waitUntilSaved();
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

    cy.startAppInstance(appFrontend.apps.signingTest, { cyUser: user, urlSuffix: instanceSuffix });

    if (Cypress.env('type') === 'production-like' && instanceSuffix) {
      // We need to reload after re-logging in on tt02 when we already had a session, because the startAppInstance
      // command will not reload the page if we already are visiting the correct URL.
      cy.reloadAndWait();
    }

    cy.assertUser(user);
  });
}
