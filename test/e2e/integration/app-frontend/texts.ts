import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Texts', () => {
  beforeEach(() => {
    cy.goto('changename');
  });

  it('Variable in texts work and are updated if the variable is updated with a calculation backend', () => {
    cy.get(appFrontend.changeOfName.newMiddleName).type('Steffen');
    cy.get(appFrontend.changeOfName.newMiddleNameDescription).should('contain.text', 'Steffen');

    // We update newLastName which triggers a calculation backend that updates NewMiddleName
    cy.get(appFrontend.changeOfName.newFirstName).type('TriggerCalculation');
    cy.get(appFrontend.changeOfName.newMiddleNameDescription).should('contain.text', 'MiddleNameFromCalculation');
  });
});
