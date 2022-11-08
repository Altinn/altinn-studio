/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import * as texts from '../../fixtures/texts.json';

const appFrontend = new AppFrontend();

describe('Dynamics', () => {
  it('Show and hide confirm name change checkbox on changing firstname', () => {
    cy.navigateToChangeName();
    cy.get(appFrontend.changeOfName.newFirstName)
      .should('be.visible')
      .type('test')
      .then(() => {
        cy.get(appFrontend.changeOfName.newMiddleName).focus();
        cy.get(appFrontend.changeOfName.confirmChangeName).should('be.visible');
      });
    cy.get(appFrontend.changeOfName.newFirstName)
      .clear()
      .then(() => {
        cy.get(appFrontend.changeOfName.newMiddleName).focus();
        cy.get(appFrontend.changeOfName.confirmChangeName).should('not.exist');
      });
  });

  it('Show and hide name change reasons radio buttons', () => {
    cy.navigateToChangeName();
    cy.get(appFrontend.changeOfName.newFirstName).should('be.visible').type('test');
    cy.get(appFrontend.changeOfName.newLastName).should('be.visible').type('test');
    cy.get(appFrontend.changeOfName.confirmChangeName).should('be.visible').find('input').check();
    cy.get(appFrontend.changeOfName.reasons).should('be.visible');
  });

  it('Remove validation message when field disappears', ()  => {
    cy.interceptLayout('changename', (component) => {
      if (component.id === 'newFirstName') {
        component.hidden = [
          'equals',
          'hideFirstName',
          ['component', 'newLastName'],
        ];
      }
      return component;
    });
    cy.navigateToChangeName();
    cy.get(appFrontend.changeOfName.newFirstName).type('test');
    cy.get(appFrontend.errorReport)
      .should('exist')
      .should('be.visible')
      .should('contain.text', texts.testIsNotValidValue);
    cy.get(appFrontend.changeOfName.newLastName).type('hideFirstName');
    cy.get(appFrontend.errorReport).should('not.exist');
    cy.get(appFrontend.changeOfName.newLastName).clear();
    cy.get(appFrontend.changeOfName.newFirstName).should('be.visible');
    cy.get(appFrontend.errorReport)
      .should('exist')
      .should('be.visible')
      .should('contain.text', texts.testIsNotValidValue);
  });
});
