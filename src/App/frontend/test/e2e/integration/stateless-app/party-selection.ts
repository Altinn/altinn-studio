import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { cyMockResponses, removeAllButOneOrg } from 'test/e2e/pageobjects/party-mocks';
import { cyUserCredentials } from 'test/e2e/support/auth';

const appFrontend = new AppFrontend();

describe('Stateless party selection', () => {
  it('should show party selection before starting instance', () => {
    const user = cyUserCredentials.accountant.firstName;
    cyMockResponses({
      partyTypesAllowed: {
        person: true,
        subUnit: false,
        bankruptcyEstate: false,
        organisation: false,
      },
      allowedToInstantiate: (parties) =>
        // Removing all other users as well, since one of the users are not allowed to instantiate on tt02
        removeAllButOneOrg(parties).filter((party) => party.orgNumber || party.name.includes(user)),
      doNotPromptForParty: false,
    });

    cy.startAppInstance(appFrontend.apps.stateless, { cyUser: 'accountant' });
    cy.get(appFrontend.partySelection.appHeader).should('be.visible');
    cy.findByText(/Jeg ønsker ikke å bli spurt om aktør hver gang/).should('be.visible');

    cy.findAllByText(/personnr\. \d+/)
      .first()
      .click(); // Select the first person we find

    cy.get(appFrontend.stateless.name).should('exist').and('be.visible');
    cy.get(appFrontend.instantiationButton).click();
    cy.get('#sendInButton').should('exist');
  });
});
