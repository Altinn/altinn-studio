import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Tenor } from 'test/e2e/support/users';

const appFrontend = new AppFrontend();

describe('Existing instance access', () => {
  it('allows access when the user has no party allowed to instantiate', () => {
    let userIsReopeningInstance = false;

    // Regression setup for https://github.com/Altinn/altinn-studio/issues/19576:
    // PartyProvider used to require at least one party allowed to instantiate before rendering anything, including
    // an existing instance. Consequently, a user with access to an existing instance saw NoValidPartiesError (403)
    // solely because they could not create a new instance. The test user can normally instantiate this app, so
    // both the buggy and fixed frontend would pass without this mock. Returning no allowed parties when reopening
    // the instance recreates the failing condition and ensures the test detects that unconditional check if it is
    // reintroduced. The user's access to the existing instance itself remains real and is verified below.
    cy.intercept('GET', '**/api/v1/parties?allowedtoinstantiatefilter=true', (req) => {
      const isReopeningInstance = userIsReopeningInstance;
      if (isReopeningInstance) {
        req.alias = 'partiesAllowedToInstantiate';
      }
      req.continue((res) => {
        res.send(isReopeningInstance ? [] : res.body);
      });
    });

    cy.startAppInstance(appFrontend.apps.signeringBrukerstyrt, {
      cyUser: null,
      tenorUser: Tenor.users.humanAndrefiolin,
      authenticationLevel: '2',
    });

    cy.findByRole('heading', { name: 'Hvem vil du sende inn for?' }).should('be.visible');
    cy.findByRole('button', {
      name: new RegExp(`org\\.nr\\. ${Tenor.orgs.sivilisertAvansertIsbjoernSA.orgNr}`, 'i'),
    }).click();

    const companyName = 'Testselskap AS';
    cy.findByRole('textbox', { name: /navn/i }).type(companyName);
    cy.waitUntilSaved();

    cy.url().then((instanceUrl) => {
      const path = new URL(instanceUrl).pathname;
      const instanceId = path.match(/\d+\/[\da-f-]{36}/i)?.[0];
      expect(instanceId, 'instance ID').to.exist;

      cy.intercept('GET', `**/instances/${instanceId}/enriched`).as('existingInstance');
      userIsReopeningInstance = true;
      cy.startAppInstance(appFrontend.apps.signeringBrukerstyrt, {
        cyUser: null,
        tenorUser: Tenor.users.humanAndrefiolin,
        authenticationLevel: '2',
        urlSuffix: `/instance/${instanceId}/`,
      });

      // Access to an existing instance must depend on the instance request, not whether the user can instantiate
      // the app. The latter is only relevant when entering the app without an instance.
      cy.wait('@partiesAllowedToInstantiate').its('response.body').should('deep.equal', []);
      cy.wait('@existingInstance').its('response.statusCode').should('eq', 200);
      cy.findByRole('textbox', { name: /navn/i }).should('have.value', companyName);
      cy.get(appFrontend.instanceErrorCode).should('not.exist');
    });
  });
});
