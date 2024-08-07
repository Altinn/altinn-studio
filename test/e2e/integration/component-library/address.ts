import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Address component', () => {
  it('Should focus the correct element when navigating from an error', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.get('ul#navigation-menu > li').last().click();
    cy.contains('button', 'Send inn').click();
    cy.contains('li', 'Du må fylle ut postnr').find('button').click();
    cy.url().should('include', '/Task_1/AddressPage');
    cy.get('input[data-bindingkey="zipCode"]').should('exist').and('have.focus');
  });
});
