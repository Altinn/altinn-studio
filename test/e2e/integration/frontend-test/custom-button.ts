import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Custom Button', () => {
  it('Should perform action and update the frontend with the updated datamodel', () => {
    cy.goto('changename');

    cy.findByRole('button', { name: 'Fyll ut skjema' }).should('not.be.disabled').click();
    cy.findByRole('textbox', { name: 'Denne oppdateres av custom button' }).should(
      'have.value',
      'Her kommer det data fra backend',
    );
  });

  it('It should show an error message if the action fails', () => {
    cy.goto('changename');

    cy.findByRole('textbox', { name: /Her kan man skrive input/ }).type('Hello b');
    cy.waitUntilSaved();

    cy.findByRole('button', { name: 'Fyll ut skjema' }).should('not.be.disabled').click();
    cy.get(appFrontend.toast).should('have.text', 'Her kommer det en feilmelding');
  });

  it('It should execute frontend actions that are sent as a result with the action', () => {
    cy.goto('changename');

    cy.findByRole('textbox', { name: /Her kan man skrive input/ }).type('Generate frontend actions');

    cy.findByRole('button', { name: 'Fyll ut skjema' }).should('not.be.disabled').click();
    cy.findByText('Oppsummering').should('be.visible');
  });

  it('It should execute frontend actions that are specified in the component', () => {
    cy.goto('changename');
    cy.waitUntilSaved();

    cy.findByRole('button', { name: 'Trigger frontend actions' }).should('not.be.disabled').click();
    cy.findByRole('textbox', { name: /Hvor mye gjeld har du?/ }).should('be.visible');
  });
});
