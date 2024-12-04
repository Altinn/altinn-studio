import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { fillInAddressAndVerify } from 'test/e2e/support/apps/component-library/fillAddressAndVerify';
import { fillInInputAndVerify } from 'test/e2e/support/apps/component-library/inputAndVerify';
import {
  uploadFileAndVerify,
  uploadFileWithTagAndVerify,
} from 'test/e2e/support/apps/component-library/uploadFileAndVerify';

const appFrontend = new AppFrontend();

const inputText = 'I type some text';

const address = 'Anders Gate 1';
const co = 'C/O Jonas Støre';
const zip = '0666';
const houseNumber = 'U0101';

const fileName = 'uploadThis.pdf';
const fileType = 'Bil';

describe('Render summary of previous task', () => {
  it('Renders the summary2 component with correct text', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    fillInInputAndVerify(inputText);
    fillInAddressAndVerify(address, co, zip, houseNumber);
    uploadFileAndVerify(fileName);
    uploadFileWithTagAndVerify(fileName, fileType);

    cy.findByRole('button', { name: /Datepicker/i }).click();
    cy.findByRole('textbox', { name: /datofeltet/i }).type('01.01.2022');

    cy.get('#navigation-menu').find('button').contains('Oppsummering 2.0').click();

    cy.changeLayout((component) => {
      if (component.type === 'PersonLookup') {
        component.required = false;
      }
    });

    cy.findByRole('button', { name: 'Send inn' }).click();

    // Wait for the URL to contain the text "PreviousProcessSummary"
    cy.url({ timeout: 60000 }).should('include', 'PreviousProcessSummary');

    // Assert that each text appears on the page as we are summarizing the whole task
    cy.contains(inputText);
    cy.contains(address);
    cy.contains(co);
    cy.contains(zip);
    cy.contains(houseNumber);
    cy.contains(fileName);
    cy.contains(fileType);

    cy.get('#navigation-menu').find('button').contains('Oppsummering av side fra tidligere Task').click();

    // Assert that the address data is rendered on the next page as we are showing the Address page.
    // None of the other data should be shown

    cy.contains(address);
    cy.contains(co);
    cy.contains(zip);
    cy.contains(houseNumber);

    cy.get('body').should('not.contain', inputText);

    cy.get('body').should('not.contain', fileName);

    cy.get('body').should('not.contain', fileType);

    // Assert that the input field data is rendered on the next page as we are showing the Input component.
    // None of the other data should be shown
    cy.get('#navigation-menu').find('button').contains('Oppsummering av komponent fra tidligere Task').click();

    cy.get('body').should('not.contain', inputText);
    cy.contains(address);
    cy.contains(co);
    cy.contains(zip);
    cy.contains(houseNumber);
    cy.get('body').should('not.contain', fileName);
    cy.get('body').should('not.contain', fileType);

    cy.url().then((currentUrl) => {
      cy.log(currentUrl);
      const newUrl = currentUrl.replace('PreviousProcessSummary', 'Task_1');
      cy.visit(newUrl);
      cy.title().should(
        'eq',
        'Denne delen av skjemaet er ikke tilgjengelig. Du kan ikke gjøre endringer her nå. - altinn-apps-all-components - Testdepartementet',
      );
    });
  });
});
