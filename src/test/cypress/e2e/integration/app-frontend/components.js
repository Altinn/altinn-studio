/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import * as texts from '../../fixtures/texts.json';

const appFrontend = new AppFrontend();

describe('UI Components', () => {
  beforeEach(() => {
    cy.intercept('**/active', []).as('noActiveInstances');
    cy.intercept('POST', `**/instances?instanceOwnerPartyId*`).as('createInstace');
    cy.startAppInstance(Cypress.env('multiData2Stage'));
    cy.wait('@createInstace');
  });

  it('Image component with help text', () => {
    cy.get('body').should('have.css', 'background-color', 'rgb(239, 239, 239)');
    cy.get(appFrontend.loadingAnimation).should('be.visible');
    cy.get(appFrontend.closeButton).should('be.visible');
    cy.get(appFrontend.header).should('contain.text', texts.startingSoon);
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
});
