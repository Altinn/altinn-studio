import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Rules', () => {
  it('Rule is run and new name is a concatenated string', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('automation');
    cy.get(appFrontend.changeOfName.newMiddleName).type('is');
    cy.get(appFrontend.changeOfName.newLastName).type('fun');
    cy.get(appFrontend.changeOfName.newFullName)
      .should('have.value', 'automation is fun')
      .parents()
      .eq(4)
      .should('have.css', 'max-width', '50%');
  });

  it('Rule is run when a backend calculation updates a relevant field', () => {
    cy.goto('changename');
    // We update newLastName which triggers a calculation backend that updates NewMiddleName to 'MiddleNameFromCalculation'
    // This should then trigger function which concatenates first + middle + last name to the newFullName field
    cy.get(appFrontend.changeOfName.newLastName).type('LastName');
    cy.get(appFrontend.changeOfName.newFirstName).type('TriggerCalculation');
    cy.get(appFrontend.changeOfName.newFullName).should(
      'have.value',
      'TriggerCalculation MiddleNameFromCalculation LastName',
    );
  });
});
