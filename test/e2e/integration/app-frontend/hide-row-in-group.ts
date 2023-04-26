import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

it('should be possible to hide rows when "Endre fra" is greater or equals to', () => {
  cy.goto('group');
  cy.get(appFrontend.group.prefill.liten).dsCheck();
  cy.get(appFrontend.nextButton).click();
  cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();
  cy.get(appFrontend.group.edit).should('be.visible');
  cy.get(appFrontend.group.hideRepeatingGroupRow).as('hideRepeatingGroupRow');
  cy.get('@hideRepeatingGroupRow').clear();
  cy.get('@hideRepeatingGroupRow').type('1');
  cy.get(appFrontend.group.edit).should('not.exist');
  cy.get('@hideRepeatingGroupRow').clear();
  cy.get('@hideRepeatingGroupRow').type('1000000');
  cy.get(appFrontend.group.edit).should('exist');
});
