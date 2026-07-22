/* eslint-disable cypress/unsafe-to-chain-command */
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Tabbing', () => {
  it('Tab through the fields in change name form', () => {
    cy.intercept('GET', '**/api/options/references?language=nb&source=altinn').as('fetchReferences');
    cy.goto('changename');

    // Making extra sure we've finished waiting for the page to load. Sometimes, if we start too early (unrealistically
    // early, compared to real users) the focus might have been reset before we get to simulate tabbing. This was
    // somewhat flaky for a while.
    cy.wait('@fetchReferences');
    cy.waitUntilSaved();

    cy.get(appFrontend.changeOfName.newFirstName).focus().tab();
    cy.focused().should('have.text', 'Nytt mellomnavn');
    cy.tab();
    cy.focused().click();
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
