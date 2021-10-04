/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Formatting', () => {
  it('Number formatting', () => {
    cy.navigateToChangeName();
    cy.get(appFrontend.changeOfName.mobilenummer)
      .should('be.visible')
      .type('44444444')
      .should('have.value', '+47 444 44 444');
    cy.completeChangeNameForm('a', 'a');
    cy.get(appFrontend.backButton).should('be.visible');
    cy.intercept('**/api/layoutsettings/group').as('getLayoutGroup');
    cy.get(appFrontend.sendinButton).should('be.visible').click();
    cy.wait('@getLayoutGroup');
    cy.get(appFrontend.group.showGroupToContinue).then((checkbox) => {
      cy.get(checkbox).should('be.visible').find('input').check();
    });
    cy.get(appFrontend.group.addNewItem).should('be.visible').click();
    cy.get(appFrontend.group.currentValue).should('be.visible').type('1').should('have.value', 'NOK 1');
    cy.get(appFrontend.group.newValue).type('-2').should('not.contain.value', '-');
  });
});
