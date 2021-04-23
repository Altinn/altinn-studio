/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import Common from '../../pageobjects/common';
import * as texts from '../../fixtures/texts.json';

const appFrontend = new AppFrontend();
const mui = new Common();

describe('Summary', () => {
  before(() => {
    cy.navigateToChangeName();
  });

  it('Summary of change name form', () => {
    cy.completeChangeNameForm('a', 'a');
    cy.get(appFrontend.backButton).should('be.visible');

    //Summary displays change button for editable fields and does not for readonly fields
    //navigate back to form and clear date
    cy.get(appFrontend.changeOfName.summaryNameChanges)
      .should('be.visible')
      .then((summary) => {
        cy.get(summary)
          .children()
          .contains(mui.gridContainer, 'Til:')
          .children(mui.gridItem)
          .then((items) => {
            cy.get(items).should('contain.text', 'a a');
            cy.get(items).find(mui.buttonIcon).should('not.exist');
          });

        cy.get(summary)
          .siblings()
          .contains(mui.gridContainer, texts.dateOfEffect)
          .then((summaryDate) => {
            cy.get(summaryDate).children(mui.gridItem).find(mui.buttonIcon).should('exist').and('be.visible').click();
            cy.get(appFrontend.changeOfName.dateOfEffect).clear();
            cy.contains(mui.button, texts.backToSummary).should('be.visible').click();
          });
      });

    //Summary displays error when required field is not filled
    //Navigate to form and fill the required field
    cy.get(appFrontend.changeOfName.summaryNameChanges)
      .should('exist')
      .siblings()
      .contains(mui.gridContainer, texts.dateOfEffect)
      .then((summaryDate) => {
        cy.get(summaryDate).contains(texts.dateOfEffect).should('have.css', 'color', 'rgb(226, 59, 83)');
        cy.get(summaryDate).contains(mui.gridContainer, texts.requiredField).should('be.visible');
        cy.get(summaryDate).contains('button', texts.goToRightPage).should('be.visible').click();
        cy.get(appFrontend.changeOfName.dateOfEffect)
          .siblings()
          .children(mui.buttonIcon)
          .click()
          .then(() => {
            cy.get(mui.selectedDate).parent().click();
            cy.contains(mui.button, texts.backToSummary).should('be.visible').click();
          });
      });

    //Error in summary field is removed when the required field is filled
    cy.get(appFrontend.changeOfName.summaryNameChanges)
      .should('exist')
      .siblings()
      .contains(mui.gridContainer, texts.dateOfEffect)
      .then((summaryDate) => {
        cy.get(summaryDate).contains(texts.dateOfEffect).should('not.have.css', 'color', 'rgb(226, 59, 83)');
        cy.get(summaryDate).contains(mui.gridContainer, texts.requiredField).should('not.exist');
      });
  });
});
