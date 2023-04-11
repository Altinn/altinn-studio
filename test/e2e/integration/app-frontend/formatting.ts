import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Formatting', () => {
  it('Number formatting', () => {
    cy.goto('changename');
    cy.get('#form-content-newFirstName').siblings().should('have.class', 'MuiGrid-grid-md-6');
    cy.get('#form-content-newFirstName')
      .siblings()
      .parent()
      .should('have.css', 'border-bottom', '1px dashed rgb(148, 148, 148)');
    cy.get(appFrontend.changeOfName.mobilenummer).type('44444444');
    cy.get(appFrontend.changeOfName.mobilenummer).should('have.value', '+47 444 44 444');
    cy.gotoAndComplete('changename');
    cy.get(appFrontend.backButton).should('be.visible');
    cy.intercept('**/api/layoutsettings/group').as('getLayoutGroup');
    cy.get(appFrontend.sendinButton).click();
    cy.wait('@getLayoutGroup');
    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.currentValue).type('1');
    cy.get(appFrontend.group.currentValue).should('have.value', 'NOK 1').and('have.css', 'text-align', 'right');
    cy.get(appFrontend.group.newValue).type('-2');
    cy.get(appFrontend.group.newValue).should('not.contain.value', '-').and('have.css', 'text-align', 'right');
  });
});
