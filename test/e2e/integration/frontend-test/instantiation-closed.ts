import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { cyMockResponses } from 'test/e2e/pageobjects/party-mocks';

const appFrontend = new AppFrontend();

const closedTitle = 'Du kan ikke starte denne tjenesten';
const closedText = /Det er ikke mulig å starte nye skjema i denne tjenesten/;
const expiredValidTo = '2020-01-01T00:00:00Z';
const futureValidFrom = '2099-01-01T10:00:00Z';

describe('Instantiation closed', () => {
  beforeEach(() => {
    cy.intercept('POST', '**/instances**').as('instantiate');
  });

  function assertNoInstantiationRequest() {
    cy.get('@instantiate.all').should('have.length', 0);
  }

  it('should not instantiate when validTo has passed', () => {
    cy.allowFailureOnEnd();
    cyMockResponses({ onEntryShow: 'new-instance', validTo: expiredValidTo });
    cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'manager' });

    cy.findByRole('heading', { name: closedTitle }).should('be.visible');
    cy.findByText(closedText).should('be.visible');
    assertNoInstantiationRequest();
  });

  it('should not instantiate before validFrom, and say when the service opens', () => {
    cy.allowFailureOnEnd();
    cyMockResponses({ onEntryShow: 'new-instance', validFrom: futureValidFrom });
    cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'manager' });

    cy.findByRole('heading', { name: 'Denne tjenesten har ikke åpnet ennå' }).should('be.visible');
    cy.findByText(/Tjenesten åpner 01\.01\.2099/).should('be.visible');
    assertNoInstantiationRequest();
  });

  it('should still list active instances, but not offer to start a new one, when validTo has passed', () => {
    cyMockResponses({
      onEntryShow: 'select-instance',
      validTo: expiredValidTo,
      activeInstances: [
        { id: 'abc123', lastChanged: '2023-01-01T00:00:00.000Z', lastChangedBy: 'user' },
        { id: 'def456', lastChanged: '2023-01-02T00:00:00.000Z', lastChangedBy: 'user' },
      ],
    });
    cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'manager' });

    cy.findByText('Du har allerede startet å fylle ut dette skjemaet.').should('be.visible');
    cy.findAllByRole('button', { name: /Fortsett her/ }).should('have.length', 2);
    cy.findByText(closedText).should('be.visible');
    cy.findByRole('button', { name: 'Start på nytt' }).should('not.exist');
    assertNoInstantiationRequest();
  });

  it('should show the closed page when the backend responds with 410', () => {
    cy.allowFailureOnEnd();
    cyMockResponses({ onEntryShow: 'new-instance' });
    cy.intercept('POST', '**/instances**', { statusCode: 410, body: 'Instantiation is closed' }).as('instantiate');
    cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'manager' });

    cy.wait('@instantiate');
    cy.findByRole('heading', { name: closedTitle }).should('be.visible');
    cy.findByText('Feil 410').should('be.visible');
  });

  it('should not block instantiation on a non-production host when disallowUserInstantiation is set', () => {
    // Only the metadata the browser sees is changed here, so this covers the host check in the frontend, not the
    // backend. The app backend enforces disallowUserInstantiation in production only, which these tests never run in.
    cyMockResponses({ onEntryShow: 'new-instance', disallowUserInstantiation: true });
    cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'manager' });

    cy.wait('@instantiate');
    cy.url().should('match', /\/instance\/\d+\/[0-9a-f-]+/);
    cy.findByRole('heading', { name: closedTitle }).should('not.exist');
  });
});
