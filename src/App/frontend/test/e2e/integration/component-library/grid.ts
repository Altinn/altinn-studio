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

  it('Summary2 should render null-cells as empty strings', () => {
    cy.gotoNavPage('Grid');

    cy.changeLayout((component) => {
      if (component.type === 'Grid' && component.id === 'grid-example-common-fields') {
        let counter = 0;
        for (const row of component.rows) {
          for (const cellIdx in row.cells) {
            const original = row.cells[cellIdx];
            row.cells[cellIdx] = counter++ % 3 === 0 ? original : null;
          }
        }
      }
    });

    // Asserts that all rows have the same amount of cells. There used to be a bug where the Summary2 table
    // would just skip these cells when null, but that breaks the table visual.
    const rows = [0, 1, 2, 3, 4];
    cy.findByTestId('summary-grid-example-common-fields').find('tr').should('have.length', rows.length);
    for (const rowIdx of rows) {
      cy.findByTestId('summary-grid-example-common-fields')
        .find('tr')
        .eq(rowIdx)
        .find('td,th')
        .should('have.length', 5);
    }
  });
});
