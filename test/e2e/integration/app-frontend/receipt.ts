import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Common } from 'test/e2e/pageobjects/common';
import { customReceipt } from 'test/e2e/support/customReceipt';

const mui = new Common();
const appFrontend = new AppFrontend();

describe('Receipt', () => {
  it('Receipt page displays links and attachments', () => {
    cy.goto('confirm', 'with-data');
    cy.get(appFrontend.confirm.sendIn).click();
    cy.get(appFrontend.receipt.container)
      .find(mui.tableBody)
      .then((table) => {
        cy.wrap(table).should('exist').and('be.visible');
        cy.wrap(table).contains(mui.tableElement, 'Mottaker').siblings().should('contain.text', texts.ttd);
      });
    cy.get(appFrontend.receipt.linkToArchive).should('be.visible');
    cy.get(appFrontend.receipt.pdf)
      .find('a')
      .should('have.length', 5) // This is the number of process data tasks
      .first()
      .should('contain.text', `${appFrontend.apps.frontendTest}.pdf`);

    cy.get(appFrontend.receipt.uploadedAttachments)
      .last()
      .find('a')
      .should('have.length', 5)
      .should('contain.text', `test.pdf`)
      .should('contain.text', `attachment-in-single.pdf`)
      .should('contain.text', `attachment-in-multi1.pdf`)
      .should('contain.text', `attachment-in-multi2.pdf`)
      .should('contain.text', `attachment-in-nested.pdf`);

    cy.get('body').should('have.css', 'background-color', 'rgb(212, 249, 228)');
    cy.get(appFrontend.header).should('contain.text', texts.ttd);

    cy.get('#attachment-collapsible-list').should('contain.text', 'Vedlegg (5)');

    cy.snapshot('receipt');
  });

  it('Custom receipt shows as expected', () => {
    let settingsCount = 0;
    let layoutCount = 0;
    cy.intercept('**/layoutsettings/**', (req) => {
      req.on('response', (res) => {
        settingsCount++;
        // Layout settings is returned as text/plain for some reason
        const settings = JSON.parse(res.body);
        settings.receiptLayoutName = 'receipt';
        res.body = JSON.stringify(settings);
      });
    }).as('LayoutSettings');
    cy.intercept('**/layouts/**', (req) => {
      req.on('response', (res) => {
        layoutCount++;
        // Layouts are returned as text/plain for some reason
        const layouts = JSON.parse(res.body);
        layouts.receipt = { data: { layout: customReceipt } };
        res.body = JSON.stringify(layouts);
      });
    }).as('FormLayout');
    cy.goto('confirm', 'with-data');
    cy.get(appFrontend.confirm.sendIn).click();

    cy.get(appFrontend.receipt.container).should('not.exist');
    cy.get('[data-testId=custom-receipt]').should('exist').and('be.visible');
    cy.get('#form-content-r-instance').should('exist').and('be.visible');
    cy.get('#form-content-r-header').should('contain.text', 'Custom kvittering');
    cy.get('#form-content-r-paragraph').should(
      'contain.text',
      'Takk for din innsending, dette er en veldig fin custom kvittering.',
    );

    // TODO: Update test when the language subsystem fetches these texts correctly
    cy.get('#form-content-r-header-pdfs').should('contain.text', 'receipt.title_submitted');
    cy.get('#form-content-r-pdfs').find('[data-testId=attachment-list]').children().should('have.length', 5);
    cy.get('#form-content-r-pdfs').should('contain.text', 'frontend-test.pdf');
    cy.get('#form-content-r-header-attachments').should('contain.text', 'receipt.attachments');
    cy.get('#form-content-r-attachments').find('[data-testId=attachment-list]').children().should('have.length', 1);
    cy.get('#form-content-r-attachments').should('contain.text', 'test.pdf');
    cy.snapshot('custom-receipt');

    /*
      Verify that layout and settings are not fetched on refresh
      This is a limitation with the current implementation that
      causes the custom receipt to not show on refresh.
    */

    let settingsBeforeRefreshCount, layoutBeforeRefreshCount;
    cy.wrap({}).then(() => {
      settingsBeforeRefreshCount = settingsCount;
      layoutBeforeRefreshCount = layoutCount;
    });
    cy.reloadAndWait().then(() => {
      expect(settingsCount).to.eq(settingsBeforeRefreshCount);
      expect(layoutCount).to.eq(layoutBeforeRefreshCount);
    });

    cy.get('[data-testId=custom-receipt]').should('not.exist');
    cy.get(appFrontend.receipt.container).should('exist').and('be.visible');
    cy.get('#attachment-collapsible-list').should('contain.text', 'Vedlegg (5)');
  });
});
