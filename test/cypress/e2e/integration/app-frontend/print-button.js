/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';

const appFrontend = new AppFrontend();

Cypress.Commands.add('wasCalled', (stubOrSpy) => {
  expect(stubOrSpy).to.be.called;
});

describe('Print button', () => {
  it('check that print button is present, and window.print is called', () => {
    cy.intercept('**/active', []).as('noActiveInstances');
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.closeButton).should('be.visible');
    cy.get(appFrontend.message['header']).should('exist');
    cy.get(appFrontend.sendinButton).click();

    cy.window().then((win) => {
      const printStub = cy.stub(win, 'print');
      cy.contains('button', 'Print / Lagre PDF').should('be.visible').click();
      cy.wasCalled(printStub);
    });
  });
});
