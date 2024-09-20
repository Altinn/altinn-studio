import { fillInAddressAndVerify } from 'test/e2e/integration/component-library/utils/fillAddressAndVerify';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Address component', () => {
  it('Should focus the correct element when navigating from an error', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.get('ul#navigation-menu > li').last().click();
    cy.contains('button', 'Send inn').click();
    cy.contains('button', 'Du må fylle ut postnr').click();
    cy.url().should('include', '/Task_1/AddressPage');
    cy.get('input[data-bindingkey="zipCode"]').should('exist').and('have.focus');
  });

  it('Renders the summary2 component with correct text', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    const address = 'Anders Gate 1';
    const co = 'C/O Jonas Støre';
    const zip = '0666';
    const houseNumber = 'U0101';
    fillInAddressAndVerify(address, co, zip, houseNumber);
  });

  it('should pass accessibility tests', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.findByRole('button', { name: /adresse/i }).click();
    cy.testWcag();
  });
});
