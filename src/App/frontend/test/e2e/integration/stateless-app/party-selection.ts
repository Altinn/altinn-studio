import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

// Party selection redirects are handled by the backend (HomeController).
// User 2001 (multiPartyPrompt) has doNotPromptForParty=false in localtest,
// so the backend will redirect to party selection.

describe('Stateless party selection', () => {
  it('should show party selection before starting instance', () => {
    // User 2001 has multiple parties and doNotPromptForParty=false
    cy.startAppInstance(appFrontend.apps.stateless, { cyUser: 'multiPartyPrompt' });
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
