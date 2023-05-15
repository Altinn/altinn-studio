import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Common } from 'test/e2e/pageobjects/common';

const appFrontend = new AppFrontend();
const mui = new Common();

describe('Grid component', () => {
  it('should work with basic table functionality', () => {
    cy.goto('changename');
    cy.navPage('grid').click();

    // Dynamics hiding the entire grid table
    cy.get(appFrontend.grid.gridWithAll).should('be.visible');
    cy.get(appFrontend.grid.showGridWithAll).find('label:contains("Nei")').click();
    cy.get(appFrontend.grid.gridWithAll).should('not.exist');

    // Dynamics hiding an entire row
    cy.get(appFrontend.grid.hasCreditCard).find('label:contains("Nei")').click();
    cy.get(appFrontend.grid.grid).find('tr').should('have.length', 4);
    cy.get(appFrontend.grid.hasCreditCard).find('label:contains("Ja")').click();
    cy.get(appFrontend.grid.grid).find('tr').should('have.length', 5);

    // Filling out the form without ending up at 100% total. We reference these fields in their respective rows
    // not because we can't reference them directly, but to verify that they exist inside the grid and not outside.
    cy.get(appFrontend.grid.totalAmount).type('1000000');
    cy.get(appFrontend.grid.grid).find('tr').eq(1).find(appFrontend.grid.bolig.percent).type('70');
    cy.get(appFrontend.grid.grid).find('tr').eq(2).find(appFrontend.grid.studie.percent).type('10');
    cy.get(appFrontend.grid.grid).find('tr').eq(3).find(appFrontend.grid.kredittkort.percent).type('5');
    cy.get(appFrontend.grid.grid).find('tr').eq(4).find(appFrontend.grid.totalPercent).should('have.value', '85 %');
    cy.get(appFrontend.grid.bolig.percentComponent).should('not.contain.text', 'Prosentandel av gjeld i boliglån');
    cy.get(appFrontend.errorReport).should('not.exist');

    // Fill out the rest of the form, so that we can attempt to send it and only get the validation message we care
    // about for Grid.
    cy.navPage('form').click();
    cy.get(appFrontend.changeOfName.newFirstName).type('first name');
    cy.get(appFrontend.changeOfName.newLastName).type('last name');
    cy.get(appFrontend.changeOfName.confirmChangeName).find('input').dsCheck();
    cy.get(appFrontend.changeOfName.reasonRelationship).click();
    cy.get(appFrontend.changeOfName.reasonRelationship).type('hello world');
    cy.get(appFrontend.changeOfName.dateOfEffect).siblings().children(mui.buttonIcon).click();
    cy.get(mui.selectedDate).click();
    cy.navPage('grid').click();

    // Validation error should be displayed in the error report and along with the totalAmount field
    cy.get(appFrontend.sendinButton).click();
    cy.get(appFrontend.errorReport).should('contain.text', 'Må summeres opp til 100%');
    cy.get(appFrontend.grid.totalPercent).parents('td').should('contain.text', 'Må summeres opp til 100%');

    // Make sure markdown works in text cells
    cy.get(appFrontend.grid.grid).find('tr').eq(1).find('td').eq(0).should('contain.text', 'Boliglån');
    cy.changeLayout((component) => {
      if (component.type === 'Grid') {
        const cell = component.rows[1].cells[0];
        if (cell && 'text' in cell) {
          cell.text = 'Mitt **bolig**lån';
        }
      }
    });
    cy.get(appFrontend.grid.grid).find('tr').eq(1).find('td').eq(0).should('contain.text', 'Mitt boliglån');

    // Verify that the summary is correct
    cy.navPage('summary').click();
    cy.get(appFrontend.grid.summary).should('be.visible');
    cy.get(appFrontend.grid.summary).find(appFrontend.grid.bolig.percentSummary).should('contain.text', '70 %');
    cy.get(appFrontend.grid.summary).find(appFrontend.grid.bolig.amountSummary).should('contain.text', '700 000 kr');
    cy.get(appFrontend.grid.summary)
      .find(appFrontend.grid.bolig.verifiedSummary)
      .should('contain.text', texts.emptySummary);
    cy.get(appFrontend.grid.summary).find(appFrontend.grid.studie.percentSummary).should('contain.text', '10 %');
    cy.get(appFrontend.grid.summary).find(appFrontend.grid.studie.amountSummary).should('contain.text', '100 000 kr');
    cy.get(appFrontend.grid.summary)
      .find(appFrontend.grid.studie.verifiedSummary)
      .should('contain.text', texts.emptySummary);
    cy.get(appFrontend.grid.summary).find(appFrontend.grid.kredittkort.percentSummary).should('contain.text', '5 %');
    cy.get(appFrontend.grid.summary)
      .find(appFrontend.grid.kredittkort.amountSummary)
      .should('contain.text', '50 000 kr');
    cy.get(appFrontend.grid.summary)
      .find(appFrontend.grid.kredittkort.verifiedSummary)
      .should('contain.text', texts.emptySummary);

    // Testing that mobile view breaks down into regular components without a table
    cy.navPage('grid').click();
    cy.viewport('samsung-s10');
    cy.get(appFrontend.grid.grid).should('be.visible');
    cy.get(appFrontend.grid.grid).find('tr').should('not.exist');
    cy.get(appFrontend.grid.bolig.percent).should('have.value', '70 %');
    cy.get(appFrontend.grid.bolig.percentComponent).should('contain.text', 'Prosentandel av gjeld i boliglån');
    cy.get(appFrontend.grid.bolig.verifiedComponent).should(
      'contain.text',
      'Er fordelingen av boliglånsgjeld verifisert?',
    );
    cy.get(appFrontend.grid.studie.percent).should('have.value', '10 %');
    cy.get(appFrontend.grid.studie.percentComponent).should('contain.text', 'Prosentandel av gjeld i studielån');
    cy.get(appFrontend.grid.studie.verifiedComponent).should(
      'contain.text',
      'Er fordelingen av studielånsgjeld verifisert?',
    );
    cy.get(appFrontend.grid.kredittkort.percent).should('have.value', '5 %');
    cy.get(appFrontend.grid.kredittkort.percentComponent).should('contain.text', 'Prosentandel av gjeld i kredittkort');
    cy.get(appFrontend.grid.kredittkort.verifiedComponent).should(
      'contain.text',
      'Er fordelingen av kredittkortgjeld verifisert?',
    );
    cy.get(appFrontend.grid.hasCreditCard).find('label:contains("Nei")').click();
    cy.get(appFrontend.grid.kredittkort.percent).should('not.exist');
    cy.get(appFrontend.grid.kredittkort.percentComponent).should('not.exist');
    cy.get(appFrontend.grid.kredittkort.verifiedComponent).should('not.exist');
  });
});
