import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Rules', () => {
  it('Rule is run and new name is a concatenated string', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('automation');
    cy.get(appFrontend.changeOfName.newMiddleName).type('is');
    cy.findByRole('tab', { name: /nytt etternavn/i }).click();
    cy.get(appFrontend.changeOfName.newLastName).type('fun');
    cy.get(appFrontend.changeOfName.newFullName).should('have.value', 'automation is fun');
  });

  it('Rule is run when a backend calculation updates a relevant field', () => {
    cy.goto('changename');
    cy.findByRole('tab', { name: /nytt etternavn/i }).click();
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
