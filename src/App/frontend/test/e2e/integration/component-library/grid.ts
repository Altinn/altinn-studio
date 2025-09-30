import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Grid summary test', () => {
  beforeEach(() => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
  });

  it('Shows Summary2 of Grid correctly', () => {
    cy.gotoNavPage('Grid');

    const gridSummary1 = 'table[data-testid="summary-all-grid-components"]';
    const gridSummary2 = 'table[data-testid="summary-grid-example-common-fields"]';

    cy.get(`${gridSummary1} tr`).last().find('td').eq(1).should('have.text', '');
    cy.get(`${gridSummary2} tr`).eq(2).find('td').eq(1).should('have.text', '');

    cy.get('#grid-input-field-two').type('Test input field 2');
    cy.get(`${gridSummary2} tr`).eq(2).find('td').eq(1).should('have.text', 'Test input field 2');

    cy.visualTesting('grid-summary');
  });
});
