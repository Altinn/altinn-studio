import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Datalist } from 'test/e2e/pageobjects/datalist';

const appFrontend = new AppFrontend();
const dataListPage = new Datalist();

describe('Custom confirm page', () => {
  it('Should load the custom confirm page and allow the user to navigate back', () => {
    cy.goto('datalist');

    cy.get(dataListPage.tableBody).contains('Johanne').closest('tr').click();
    cy.get(appFrontend.nextButton).click();
    cy.get('[data-componentid="useCustomConfirm"]').findByText('Ja, bruk egendefinert').click();
    cy.get(appFrontend.backButton).click();

    for (const name of ['Caroline', 'Kåre', 'Petter']) {
      cy.get(dataListPage.tableBody).contains(name).closest('tr').click();
      cy.get(appFrontend.nextButton).click();
      cy.get(appFrontend.sendinButton).click();

      cy.get('[data-componentid="confirmBody"]').should('contain.text', 'Dette er en egendefinert bekreftelsesside');
      cy.get('[data-componentid="confirmBody"]').should('contain.text', `på forrige side valgte du ${name}.`);
      cy.get('[data-componentid="back"]').click();

      cy.get(dataListPage.tableBody).contains(name).closest('tr').find('input').should('be.checked');
    }

    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.sendinButton).click();
    cy.get('[data-componentid="confirmBody"]').should('contain.text', 'Dette er en egendefinert bekreftelsesside');
    cy.get('[data-componentid="confirmBody"]').should('contain.text', `på forrige side valgte du Petter.`);
    cy.get('[data-componentid="sendInButton"]').click();

    cy.get('#ReceiptContainer').should('contain.text', 'Skjema er sendt inn');
  });
});
