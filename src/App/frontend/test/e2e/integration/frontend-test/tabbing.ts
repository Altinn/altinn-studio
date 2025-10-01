/* eslint-disable cypress/unsafe-to-chain-command */
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Tabbing', () => {
  it('Tab through the fields in change name form', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).focus().tab();
    cy.focused().should('have.text', 'Nytt mellomnavn');
    cy.tab().click();
    cy.get(appFrontend.changeOfName.newLastName).type('a').blur().tab().tab();
    cy.focused()
      .should('have.value', 'a')
      .should('have.attr', 'id')
      .and('eq', appFrontend.changeOfName.newFullName.substring(1));
    cy.get(appFrontend.changeOfName.confirmChangeName).should('exist');
    cy.tab().tab().tab({
      shift: true,
    });
    cy.focused().should('have.attr', 'type').and('eq', 'checkbox');
  });
});
