import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { cyMockResponses } from 'test/e2e/pageobjects/party-mocks';

const appFrontend = new AppFrontend();

describe('Instantiation', () => {
  // See ttd/frontend-test/App/logic/Instantiation/InstantiationValidator.cs
  const invalidParty =
    Cypress.env('type') === 'localtest'
      ? /950474084/ // Localtest: Oslos Vakreste borettslag
      : /310732001/; // TT02: Søvnig Impulsiv Tiger AS

  it('should show an error message when going directly to instantiation', () => {
    cyMockResponses({
      doNotPromptForParty: false,
      onEntryShow: 'new-instance',
    });
    cy.startAppInstance(appFrontend.apps.frontendTest, { user: 'manager' });
    cy.findByRole('button', { name: invalidParty }).click();

    cy.findByText('Du kan ikke starte denne tjenesten').should('be.visible');
    assertErrorMessage();
  });

  it('should show an error message when starting a new instance from instance-selection', () => {
    cyMockResponses({
      doNotPromptForParty: false,
      onEntryShow: 'select-instance',
      activeInstances: [
        { id: 'abc123', lastChanged: '2023-01-01T00:00:00.000Z', lastChangedBy: 'user' },
        { id: 'def456', lastChanged: '2023-01-02T00:00:00.000Z', lastChangedBy: 'user' },
      ],
    });
    cy.startAppInstance(appFrontend.apps.frontendTest, { user: 'manager' });
    cy.findByRole('button', { name: invalidParty }).click();

    cy.findByText('Du har allerede startet å fylle ut dette skjemaet.').should('be.visible');
    cy.findByRole('button', { name: 'Start på nytt' }).click();

    assertErrorMessage();
    cy.findByText('Du kan ikke starte denne tjenesten').should('not.exist');
  });

  function assertErrorMessage() {
    cy.findByText(
      /Aktøren du valgte kan ikke opprette en instans av dette skjemaet. Dette er en egendefinert feilmelding for akkurat denne appen./,
    ).should('be.visible');
    cy.findByRole('link', { name: 'Vennligst velg en annen aktør' }).click();

    cy.findByRole('button', { name: invalidParty }).should('be.visible');
  }
});
