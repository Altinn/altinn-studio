import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { cyMockResponses, removeAllButOneOrg } from 'test/e2e/pageobjects/party-mocks';

const appFrontend = new AppFrontend();

describe('Stateless party selection', () => {
  it('should show party selection before starting instance', () => {
    cyMockResponses({
      partyTypesAllowed: {
        person: true,
        subUnit: false,
        bankruptcyEstate: false,
        organisation: false,
      },
      allowedToInstantiate: removeAllButOneOrg,
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
