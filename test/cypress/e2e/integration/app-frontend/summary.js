/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import Common from '../../pageobjects/common';
import * as texts from '../../fixtures/texts.json';

const appFrontend = new AppFrontend();
const mui = new Common();

describe('Summary', () => {
  it('Summary of change name form', () => {
    cy.interceptLayout('changename', (component) => {
      if (component.id === 'changeNameFrom') {
        component.hidden = ['equals', ['component', 'newFirstName'], 'hidePrevName'];
      }
    });
    cy.gotoAndComplete('changename');
    cy.get(appFrontend.backButton).should('be.visible');

    // Summary displays change button for editable fields and does not for readonly fields
    // navigate back to form and clear date
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
            cy.get(appFrontend.changeOfName.upload).selectFile('e2e/fixtures/test.pdf', { force: true });
            cy.get(appFrontend.changeOfName.uploadWithTag.uploadZone).selectFile('e2e/fixtures/test.pdf', {
              force: true,
            });
            cy.get(appFrontend.changeOfName.uploadWithTag.tagsDropDown).should('be.visible').select('address');
            cy.get(appFrontend.changeOfName.uploadWithTag.saveTag).should('be.visible').click();
            cy.contains(mui.button, texts.backToSummary).should('be.visible').click();
          });
      });

    // Summary of attachment components
    cy.get(appFrontend.changeOfName.summaryNameChanges)
      .should('exist')
      .siblings()
      .then((summary) => {
        cy.get(summary)
          .contains(mui.gridContainer, texts.uplodDocs)
          .contains(mui.gridItem, 'test.pdf')
          .should('be.visible');
        cy.get(summary)
          .contains(mui.gridContainer, texts.uploadWithTag)
          .contains(mui.gridItem, 'test.pdf')
          .should('be.visible')
          .and('contain.text', 'Adresse');
      });

    // Summary displays error when required field is not filled
    // Navigate to form and fill the required field
    cy.get(appFrontend.changeOfName.summaryNameChanges)
      .should('exist')
      .siblings()
      .contains(mui.gridContainer, texts.dateOfEffect)
      .then((summaryDate) => {
        cy.get(summaryDate).contains(texts.dateOfEffect).should('have.css', 'color', 'rgb(213, 32, 59)');
        cy.get(summaryDate).contains(mui.gridContainer, texts.requiredFieldDateFrom).should('be.visible');
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

    // Error in summary field is removed when the required field is filled
    cy.get(appFrontend.changeOfName.summaryNameChanges)
      .should('exist')
      .siblings()
      .contains(mui.gridContainer, texts.dateOfEffect)
      .then((summaryDate) => {
        cy.get(summaryDate).contains(texts.dateOfEffect).should('not.have.css', 'color', 'rgb(213, 32, 59)');
        cy.get(summaryDate).contains(mui.gridContainer, texts.requiredFieldDateFrom).should('not.exist');

      });

    // Hide the component the Summary refers to, which should hide the summary component as well
    cy.get('[data-testid=summary-summary-1]').contains('span', 'Du har valgt å endre:').should('be.visible');
    cy.get(appFrontend.navMenu).find('li > button').first().click();
    cy.get(appFrontend.changeOfName.newFirstName).clear().type('hidePrevName');
    cy.get(appFrontend.navMenu).find('li > button').last().click();
    cy.get('[data-testid=summary-summary-1]').should('not.exist');

    // Test mapped options in summary

    cy.get('[data-testid=summary-summary-7]').should('exist').and('be.visible');
    cy.get('[data-testid=summary-summary-8]').should('exist').and('be.visible');

    cy.get(appFrontend.navMenu).find('li > button').first().click();
    cy.get('#reference').should('exist').and('be.visible').select('Ola Nordmann');
    cy.get('#reference2').should('exist').and('be.visible').select('Ole');
    cy.get(appFrontend.navMenu).find('li > button').last().click();
    cy.get('[data-testid=summary-summary-7]').should('exist').and('be.visible').and('contain.text', 'Ola Nordmann');
    cy.get('[data-testid=summary-summary-8]').should('exist').and('be.visible').and('contain.text', 'Ole');

    cy.get(appFrontend.navMenu).find('li > button').first().click();
    cy.intercept('GET', '**/options/*').as('getOptions');
    cy.get('#sources').should('exist').and('be.visible').select('Digitaliseringsdirektoratet');
    cy.wait(['@getOptions', '@getOptions']);
    cy.get('#reference').should('exist').and('be.visible').select('Sophie Salt');
    cy.get('#reference2').should('exist').and('be.visible').select('Dole');
    cy.get(appFrontend.navMenu).find('li > button').last().click();
    cy.get('[data-testid=summary-summary-7]').should('exist').and('be.visible').and('contain.text', 'Sophie Salt');
    cy.get('[data-testid=summary-summary-8]').should('exist').and('be.visible').and('contain.text', 'Dole');

    cy.get(appFrontend.navMenu).find('li > button').first().click();
    cy.get('#sources').should('exist').and('be.visible').select('Annet');
    cy.wait(['@getOptions', '@getOptions']);
    cy.get('#reference').should('exist').and('be.visible').select('Test');
    cy.get('#reference2').should('exist').and('be.visible').select('Doffen');
    cy.get(appFrontend.navMenu).find('li > button').last().click();
    cy.get('[data-testid=summary-summary-7]').should('exist').and('be.visible').and('contain.text', 'Test');
    cy.get('[data-testid=summary-summary-8]').should('exist').and('be.visible').and('contain.text', 'Doffen');
  });

  it('is possible to view summary of repeating group', () => {
    cy.gotoAndComplete('group');
    cy.get(appFrontend.group.mainGroupSummary)
      .should('be.visible')
      .and('have.length', 1)
      .first()
      .children(mui.gridItem)
      .should('have.length', 8)
      .then((item) => {
        cy.get(item).find(mui.buttonIcon).should('have.length', 7);
        cy.get(item)
          .eq(1)
          .children(mui.gridContainer)
          .should('have.css', 'border-bottom', '1px dashed rgb(0, 143, 214)');
        cy.get(item).eq(3).should('contain.text', 'attachment-in-single.pdf');
        cy.get(item).eq(4).should('contain.text', 'attachment-in-multi1.pdf');
        cy.get(item).eq(4).should('contain.text', 'attachment-in-multi2.pdf');
        cy.get(item).eq(5).should('contain.text', 'attachment-in-nested.pdf');
        cy.get(item).eq(5).should('contain.text', 'automation');
        cy.get(item).eq(5).should('contain.text', texts.nestedOptionsToggle);
        cy.get(item).eq(5).should('not.contain.text', texts.nestedOptions);
        cy.get(item).eq(5).should('contain.text', 'hvor fikk du vite om skjemaet? : Annet');
        cy.get(item).eq(5).should('contain.text', 'Referanse : Test');
        cy.get(item).eq(6).should('contain.text', 'Digitaliseringsdirektoratet');
        cy.get(item).eq(7).should('contain.text', 'Sophie Salt');

        // Go back to the repeating group in order to set nested options
        cy.get(item).eq(5).find('button').first().should('contain.text', texts.change).click();
      });

    // Check to show a couple of nested options, then go back to the summary
    cy.get(appFrontend.group.rows[0].editBtn).click();
    cy.get(appFrontend.group.mainGroup)
      .find(appFrontend.group.editContainer)
      .find(appFrontend.group.next).click();
    cy.get(appFrontend.group.rows[0].nestedGroup.rows[0].nestedDynamics).click();

    const workAroundSlowSave = JSON.parse('true');
    if (workAroundSlowSave) {
      // Blurring each of these works around a problem where clicking these too fast will overwrite the immedateState
      // value in useDelayedSaveState(). This is a fundamental problem with the useDelayedSaveState() functionality,
      // and in the future we should fix this properly by simplifying to save data immediately in the redux state
      // but delay the PUT request instead.
      // See https://github.com/Altinn/app-frontend-react/issues/339#issuecomment-1321920974
      cy.get(appFrontend.group.rows[0].nestedGroup.rows[0].nestedOptions[1]).check().blur();
      cy.get(appFrontend.group.rows[0].nestedGroup.rows[0].nestedOptions[2]).check().blur();
    } else {
      cy.get(appFrontend.group.rows[0].nestedGroup.rows[0].nestedOptions[1]).check();
      cy.get(appFrontend.group.rows[0].nestedGroup.rows[0].nestedOptions[2]).check();
    }

    cy.get(appFrontend.group.rows[0].nestedGroup.saveBtn).click();
    cy.get(appFrontend.group.saveMainGroup).click();
    cy.contains(mui.button, texts.backToSummary).click();

    cy.get(appFrontend.group.mainGroupSummary)
      .should('be.visible')
      .and('have.length', 1)
      .first()
      .children(mui.gridItem)
      .should('have.length', 8)
      .then((item) => {
        cy.get(item).eq(5).should('contain.text', texts.nestedOptionsToggle);
        cy.get(item).eq(5).should('contain.text', texts.nestedOptions);
        cy.get(item).eq(5).should('contain.text', `${texts.nestedOption2}, ${texts.nestedOption3}`);
      });

    // Hiding the group should hide the group summary as well
    cy.get('[data-testid=summary-summary-1]').should('be.visible');
    cy.get(appFrontend.navMenu).find('li > button').eq(1).click();
    cy.get(appFrontend.group.showGroupToContinue).find('input[type=checkbox]').uncheck();
    cy.get(appFrontend.navMenu).find('li > button').last().click();
    cy.get('[data-testid=summary-summary-1]').should('not.exist');
  });
});
