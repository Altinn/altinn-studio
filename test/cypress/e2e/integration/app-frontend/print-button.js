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
    cy.startAppInstance(Cypress.env('multiData2Stage'));
    cy.get(appFrontend.closeButton).should('be.visible');
    cy.get(appFrontend.message['header']).should('exist');
    cy.intercept('**/api/layoutsettings/changename').as('getLayoutChangeName');
    cy.get(appFrontend.sendinButton).then((button) => {
      cy.get(button).should('be.visible').click();
      cy.wait('@getLayoutChangeName');
    });

    cy.window().then((win) => {
      const printStub = cy.stub(win, 'print');
      cy.contains('button', 'Print / Lagre PDF').should('be.visible').click();
      cy.wasCalled(printStub);
    });
  });
});
