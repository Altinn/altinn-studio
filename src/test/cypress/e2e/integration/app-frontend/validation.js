/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import Common from '../../pageobjects/common';
import * as texts from '../../fixtures/texts.json';

const appFrontend = new AppFrontend();
const mui = new Common();

describe('Validation', () => {
  before(() => {
    cy.navigateToChangeName();
  });
  beforeEach(() => {
    cy.preserveCookies();
  });

  it('Required field validation on blur', () => {
    cy.get(appFrontend.changeOfName.newFirstName).focus().blur();
    cy.get(appFrontend.fieldValidationError.replace('field', appFrontend.changeOfName.newFirstName.substr(1)))
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.requiredField)
      .find(appFrontend.errorExclamation)
      .should('be.visible');
  });

  it('Custom field validation - error', () => {
    cy.get(appFrontend.changeOfName.newFirstName).type('test').blur();
    cy.get(appFrontend.fieldValidationError.replace('field', appFrontend.changeOfName.newFirstName.substr(1)))
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.customValidationInvalid)
      .find(appFrontend.errorExclamation)
      .should('be.visible');
  });

  it('Custom field validation - warning', () => {
    cy.get(appFrontend.changeOfName.newMiddleName).type('test').blur();
    cy.get(appFrontend.fieldValidationWarning.replace('field', appFrontend.changeOfName.newMiddleName.substr(1)))
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.customValidationInvalid)
      .should('have.css', 'background-color', 'rgb(239, 239, 239)');
  });

  it('Page validation on clicking next', () => {
    cy.get(appFrontend.changeOfName.newFirstName).clear().type('test').blur();
    cy.get(appFrontend.changeOfName.confirmChangeName).find('input').check();
    cy.get(mui.button).should('be.visible').click();
    cy.get(appFrontend.errorReport)
      .should('exist')
      .should('be.visible')
      .should('be.focused')
      .should('contain.text', texts.errorReport);
  });

  it('Validation on uploaded attachment type', () => {
    cy.get(appFrontend.changeOfName.upload).attachFile('test.png');
    cy.get(appFrontend.fieldValidationError.replace('field', appFrontend.changeOfName.upload.substr(1)))
      .should('exist')
      .should('be.visible')
      .should('contain.text', texts.attachmentError);
  });
});
