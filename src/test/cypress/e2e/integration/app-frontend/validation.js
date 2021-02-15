/// <reference types='cypress' />

import * as af from '../../pageobjects/app-frontend';
import * as texts from '../../fixtures/texts.json'

const appName = Cypress.env('localTestAppName');

describe('Rules', () => {
  before(() => {
    cy.navigateToChangeName(appName);
  });
  beforeEach(() => {
    cy.preserveCookies();
  });

  //Tests disaply of error message when required field is not hopped over
  it('Required field validation', () => {
    cy.get(af.changeOfName.newFirstName).focus().blur();
    cy.get(af.fieldValidationError + af.changeOfName.newFirstName.substr(1) + '"]')
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.requiredField);
  });

  //Tests disaply of error messages triggerd from validationHandler in the app
  it('Custom field validation - error', () => {
    cy.get(af.changeOfName.newFirstName).type('test').blur();
    cy.get(af.fieldValidationError + af.changeOfName.newFirstName.substr(1) + '"]')
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.customValidationInvalid);
  });

  //Tests disaply of error messages triggerd from validationHandler in the app
  it('Custom field validation - warning', () => {
    cy.get(af.changeOfName.newMiddleName).type('test').blur();
    cy.get(af.fieldValidationWarning + af.changeOfName.newMiddleName.substr(1) + '"]')
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.customValidationInvalid)
      .should('have.css', 'background-color', 'rgb(239, 239, 239)');
  });

});