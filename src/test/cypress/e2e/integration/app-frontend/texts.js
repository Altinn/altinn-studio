/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Texts', () => {
  beforeEach(() => {
    cy.navigateToChangeName();
  });

  it('Variable in texts work and are updated if the variable is updated with a calculation backend', () => {
    cy.get(appFrontend.changeOfName.newMiddleName).should('be.visible').type('Steffen').blur();
    cy.get(appFrontend.changeOfName.newMiddleNameDescription).should('contain.text', 'Steffen');

    // We update newLastName which triggers a calculation backend that updates NewMiddleName
    cy.get(appFrontend.changeOfName.newFirstName).should('be.visible').type('TriggerCalculation').blur();
    cy.get(appFrontend.changeOfName.newMiddleNameDescription).should('contain.text', 'MiddleNameFromCalculation');
  });
});
