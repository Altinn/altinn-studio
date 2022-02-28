/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import Common from '../../pageobjects/common';
import * as texts from '../../fixtures/texts.json';

const appFrontend = new AppFrontend();
const mui = new Common();

describe('UI Components', () => {
  beforeEach(() => {
    cy.intercept('**/active', []).as('noActiveInstances');
    cy.intercept('POST', `**/instances?instanceOwnerPartyId*`).as('createInstace');
    cy.startAppInstance(Cypress.env('multiData2Stage'));
    cy.get(appFrontend.header).should('contain.text', texts.startingSoon);
    cy.wait('@createInstace');
  });

  it('Image component with help text', () => {
    cy.get('body').should('have.css', 'background-color', 'rgb(239, 239, 239)');
    cy.get(appFrontend.loadingAnimation).should('be.visible');
    cy.get(appFrontend.closeButton).should('be.visible');
    cy.get(appFrontend.header).should('contain.text', Cypress.env('multiData2Stage')).and('contain.text', texts.ttd);
    cy.get(appFrontend.message.logo)
      .should('be.visible')
      .then((image) => {
        cy.get(image).find('img').should('have.attr', 'alt', 'Altinn logo');
        cy.get(image)
          .parentsUntil(appFrontend.message.logoFormContent)
          .eq(1)
          .should('have.css', 'justify-content', 'center');
        cy.get(image).parent().siblings().find(appFrontend.helpText.open).parent().click();
        cy.get(appFrontend.helpText.alert).contains('Altinn logo').type('{esc}');
        cy.get(appFrontend.helpText.alert).should('not.exist');
      });
    cy.get('body').should('have.css', 'background-color', 'rgb(239, 239, 239)');
  });

  it('is possible to upload and delete attachments', () => {
    cy.intercept('**/api/layoutsettings/changename').as('getLayoutChangeName');
    cy.get(appFrontend.sendinButton).then((button) => {
      cy.get(button).should('be.visible').click();
      cy.wait('@getLayoutChangeName');
    });
    cy.get(appFrontend.changeOfName.uploadDropZone).should('be.visible');
    cy.get(appFrontend.changeOfName.upload).selectFile('e2e/fixtures/test.pdf', { force: true });
    cy.get(appFrontend.changeOfName.uploadedTable).should('be.visible');
    cy.get(appFrontend.changeOfName.uploadingAnimation).should('be.visible');
    cy.get(appFrontend.changeOfName.uploadSuccess).should('exist');
    cy.get(appFrontend.changeOfName.deleteAttachment).should('have.length', 1);
    cy.get(appFrontend.changeOfName.deleteAttachment).click();
    cy.get(appFrontend.changeOfName.deleteAttachment).should('not.exist');
  });

  it('is possible to upload attachments with tags', () => {
    cy.intercept('**/api/layoutsettings/changename').as('getLayoutChangeName');
    cy.intercept('POST', '**/tags').as('saveTags');
    cy.get(appFrontend.sendinButton).then((button) => {
      cy.get(button).should('be.visible').click();
      cy.wait('@getLayoutChangeName');
    });
    cy.get(appFrontend.changeOfName.uploadWithTag.uploadZone).selectFile('e2e/fixtures/test.pdf', { force: true });
    cy.get(appFrontend.changeOfName.uploadWithTag.editWindow).should('be.visible');
    cy.get(appFrontend.changeOfName.uploadWithTag.tagsDropDown).should('be.visible').select('address');
    cy.get(appFrontend.changeOfName.uploadWithTag.saveTag).should('be.visible').click();
    cy.wait('@saveTags');
    cy.get(appFrontend.changeOfName.uploadWithTag.uploaded).then((table) => {
      cy.get(table).should('be.visible');
      cy.get(table).find(mui.tableBody).find('tr').should('have.length', 1);
      cy.get(table).find(mui.tableBody).find(mui.tableElement).eq(1).should('have.text', 'Adresse');
      cy.get(table).find(mui.tableBody).find(mui.tableElement).last().find('button').click();
    });
    cy.get(appFrontend.changeOfName.uploadWithTag.delete).should('be.visible').click();
  });

  it('is possible to navigate between pages using navigation bar', () => {
    cy.intercept('**/api/layoutsettings/changename').as('getLayoutChangeName');
    cy.get(appFrontend.sendinButton).then((button) => {
      cy.get(button).should('be.visible').click();
      cy.wait('@getLayoutChangeName');
    });
    cy.get(appFrontend.navMenu).should('be.visible');
    cy.get(appFrontend.navMenu)
      .find('li > button')
      .then((navButtons) => {
        cy.get(navButtons).should('be.visible').and('have.length', 2);
        cy.get(navButtons)
          .first()
          .should('have.attr', 'aria-current', 'page')
          .and('have.css', 'background-color', 'rgb(2, 47, 81)');
        cy.get(navButtons).last().should('have.css', 'background-color', 'rgba(0, 0, 0, 0)').click();
      });
    cy.get(appFrontend.navMenu)
      .find('li > button')
      .then((navButtons) => {
        cy.get(navButtons).should('be.visible');
        cy.get(navButtons)
          .last()
          .should('have.attr', 'aria-current', 'page')
          .and('have.css', 'background-color', 'rgb(2, 47, 81)');
        cy.get(appFrontend.changeOfName.summaryNameChanges).should('be.visible');
      });
  });

  it('address component fetches post place from zip code', () => {
    cy.intercept('**/api/layoutsettings/changename').as('getLayoutChangeName');
    cy.get(appFrontend.sendinButton).then((button) => {
      cy.get(button).should('be.visible').click();
      cy.wait('@getLayoutChangeName');
    });
    cy.get(appFrontend.changeOfName.address.street_name).should('be.visible').type('Sesame Street 1A').blur();
    cy.get(appFrontend.changeOfName.address.zip_code).should('be.visible').type('0174').blur();
    cy.get(appFrontend.changeOfName.address.post_place).should('have.value', 'OSLO');
  });
});
