/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import * as texts from '../../fixtures/texts.json';
import Common from '../../pageobjects/common';

const appFrontend = new AppFrontend();
const mui = new Common();

describe('Options', () => {
  it('is possible to retrieve options dynamically', () => {
    cy.goto('changename');
    // Case: options are dynamically refetched based on what the user selects as source
    cy.get(appFrontend.changeOfName.sources).should('be.visible');

    // Make sure we wait until the option is visible, as it's not instant
    cy.get(appFrontend.changeOfName.reference)
      .get(`option[value=nordmann]`)
      .should('be.visible');

    cy.get(appFrontend.changeOfName.reference)
      .select('nordmann')
      .should('have.value', 'nordmann');

    //Secure options
    cy.get(appFrontend.changeOfName.reference2)
      .get('option[value=1]')
      .should('be.visible');
    cy.get(appFrontend.changeOfName.reference2)
      .should('be.visible')
      .select('1')
      .and('have.value', '1');

    // Select a different source, expect previous selection to be cleared and
    // new value to be selectable in the reference option
    cy.get(appFrontend.changeOfName.sources).select('digdir');
    cy.get(appFrontend.changeOfName.reference).should('be.visible').and('have.value', '');
    cy.get(appFrontend.changeOfName.reference).select('salt').should('have.value', 'salt');
    cy.get(appFrontend.changeOfName.reference2).should('be.visible').select('2').and('have.value', '2');
  });

  it('is possible to build options from repeating groups', () => {
    cy.goto('group');
    cy.get(appFrontend.navMenu).should('be.visible');
    cy.contains(mui.button, texts.next).click();
    cy.get(appFrontend.group.showGroupToContinue).find('input').check();
    cy.addItemToGroup(1, 2, 'automation');
    cy.addItemToGroup(3, 4, 'altinn');
    cy.get(appFrontend.group.options).then((options) => {
      cy.get(options).should('be.visible');
      cy.get(options).find('option').eq(1).should('have.text', 'Endre fra: 1, Endre til: 2');
      cy.get(options).find('option').eq(2).should('have.text', 'Endre fra: 3, Endre til: 4');
      cy.get(options).select('1').should('have.value', '1');
    });
  });
});
