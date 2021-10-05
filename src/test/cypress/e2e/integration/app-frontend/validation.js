/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import Common from '../../pageobjects/common';
import * as texts from '../../fixtures/texts.json';

const appFrontend = new AppFrontend();
const mui = new Common();

describe('Validation', () => {
  beforeEach(() => {
    cy.navigateToChangeName();
  });

  it('Required field validation on blur', () => {
    cy.get(appFrontend.changeOfName.newFirstName).should('be.visible').focus().blur();
    cy.get(appFrontend.fieldValidationError.replace('field', appFrontend.changeOfName.newFirstName.substr(1)))
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.requiredField)
      .find(appFrontend.errorExclamation)
      .should('be.visible');
  });

  it('Custom field validation - error', () => {
    cy.intercept('GET', '**/validate').as('validateData');
    cy.get(appFrontend.changeOfName.newFirstName).should('be.visible').type('test').blur();
    cy.wait('@validateData');
    cy.get(appFrontend.fieldValidationError.replace('field', appFrontend.changeOfName.newFirstName.substr(1)))
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.testIsNotValidValue)
      .then((error) => {
        cy.get(error).find(appFrontend.errorExclamation).should('be.visible');
        cy.get(error).find('a[href="https://www.altinn.no/"]').should('exist');
      });
  });

  it('Custom field validation - warning', () => {
    cy.intercept('GET', '**/validate').as('validateData');
    cy.get(appFrontend.changeOfName.newMiddleName).should('be.visible').type('test').blur();
    cy.wait('@validateData');
    cy.get(appFrontend.fieldValidationWarning.replace('field', appFrontend.changeOfName.newMiddleName.substr(1)))
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.testIsNotValidValue)
      .should('have.css', 'background-color', 'rgb(239, 239, 239)');
  });

  it('Page validation on clicking next', () => {
    cy.get(appFrontend.changeOfName.newFirstName).should('be.visible').clear().type('test').blur();
    cy.get(appFrontend.changeOfName.confirmChangeName).should('be.visible').find('input').check();
    cy.intercept('GET', '**/validate').as('validateData');
    cy.get(mui.button).should('be.visible').click();
    cy.wait('@validateData');
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

  it('Client side validation from json schema', () => {
    cy.get(appFrontend.changeOfName.newLastName).should('be.visible').type('client').blur();
    cy.get(appFrontend.fieldValidationError.replace('field', appFrontend.changeOfName.newLastName.substr(1)))
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.clientSide);
  });
});
