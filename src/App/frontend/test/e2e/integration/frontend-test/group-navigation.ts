import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Repeating group navigation', () => {
  beforeEach(() => {
    cy.goto('group');
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.liten }).check();
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.middels }).check();
    cy.get('#show-group-navigation').findByRole('radio', { name: 'Ja' }).check();
  });

  it('links to static fields before and after a nested table in the matching outer row', () => {
    for (const [position, label] of [
      ['before', 'Før tabellen'],
      ['after', 'Etter tabellen'],
    ]) {
      cy.gotoNavPage('group-navigation-summary');
      cy.get('[data-componentid="navigation-links-1"]').findByRole('link', { name: label }).click();
      cy.get(`#navigation-${position}-1`).should('be.focused').and('have.value', 'NOK 120');
      cy.get(`#navigation-${position}-0`, { timeout: 0 }).should('not.exist');
    }
  });

  it('edits the requested summary row instead of the openByDefault row', () => {
    cy.gotoNavPage('group-navigation');
    cy.get('#navigation-value-0').should('have.value', 'NOK 1');

    cy.gotoNavPage('group-navigation-summary');
    cy.get('button[data-target-id="navigation-value-1"]').click();
    cy.get('#navigation-value-1').should('be.focused').and('have.value', 'NOK 120');
    cy.get('#navigation-value-0', { timeout: 0 }).should('not.exist');
  });
});
