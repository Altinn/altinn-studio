/// <reference types='cypress' />

import AppFrontend from '../../pageobjects/app-frontend';
import Common from '../../pageobjects/common';
import * as texts from '../../fixtures/texts.json'

const appName = Cypress.env('localTestAppName');
const af = new AppFrontend();
const mui = new Common();

describe('Validation', () => {
  before(() => {
    cy.navigateToChangeName(appName);
  });
  beforeEach(() => {
    cy.preserveCookies();
  });

  //Tests display of error message when required field is not hopped over
  it('Required field validation', () => {
    cy.get(af.changeOfName.newFirstName).focus().blur();
    cy.get(af.fieldValidationError.replace('field', af.changeOfName.newFirstName.substr(1)))
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.requiredField)
      .find(af.errorExclamation).should('be.visible');
  });

  //Tests display of error messages triggerd from validationHandler in the app
  it('Custom field validation - error', () => {
    cy.get(af.changeOfName.newFirstName).type('test').blur();
    cy.get(af.fieldValidationError.replace('field', af.changeOfName.newFirstName.substr(1)))
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.customValidationInvalid)
      .find(af.errorExclamation).should('be.visible');
  });

  //Tests display of warning message triggerd from validationHandler in the app
  it('Custom field validation - warning', () => {
    cy.get(af.changeOfName.newMiddleName).type('test').blur();
    cy.get(af.fieldValidationWarning.replace('field', af.changeOfName.newMiddleName.substr(1)))
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.customValidationInvalid)
      .should('have.css', 'background-color', 'rgb(239, 239, 239)');
  });

  //Tests display of error report on top of the page when clicking next button
  it('Page validation on clicking next', () => {
    cy.get(af.changeOfName.newFirstName).clear();
    cy.get(af.changeOfName.newMiddleName).clear();
    cy.get(mui.button).click();
    cy.get(af.errorReport)
      .should('exist')
      .should('be.visible')
      .should('contain.text', texts.errorReport);
  });

  //Tests validation error on uploading a attachment of wrong type
  it('Validation on attachment type', () => {
    cy.get(af.changeOfName.upload).attachFile('test.png');
    cy.get(af.fieldValidationError.replace('field', af.changeOfName.upload.substr(1)))
      .should('exist')
      .should('be.visible')
      .should('contain.text', texts.attachmentError);
  });

});