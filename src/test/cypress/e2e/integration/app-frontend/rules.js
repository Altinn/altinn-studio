/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Rules', () => {
  it('Rule is run and new name is a concatenated string', () => {
    cy.navigateToChangeName();
    cy.get(appFrontend.changeOfName.newFirstName).type('automation');
    cy.get(appFrontend.changeOfName.newMiddleName).type('is');
    cy.get(appFrontend.changeOfName.newLastName)
      .type('fun')
      .then(() => {
        cy.get(appFrontend.changeOfName.newFullName)
          .focus()
          .should('have.value', 'automation is fun')
          .parents()
          .eq(2)
          .should('have.css', 'max-width', '50%');
      });
  });

  it('Rule is run when a backend calculation updates a relevant field', () => {
    cy.navigateToChangeName();
    // We update newLastName which triggers a calculation backend that updates NewMiddleName to 'MiddleNameFromCalculation'
    // This should then trigger function which concatenates first + middle + last name to the newFullName field
    cy.get(appFrontend.changeOfName.newLastName).should('be.visible').type('LastName').blur();
    cy.get(appFrontend.changeOfName.newFirstName).should('be.visible').type('TriggerCalculation').blur();
    cy.get(appFrontend.changeOfName.newFullName).should(
      'have.value',
      'TriggerCalculation MiddleNameFromCalculation LastName',
    );
  });
});
