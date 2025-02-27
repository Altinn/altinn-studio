import { beforeEach } from 'mocha';

import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('List component', () => {
  beforeEach(() => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Liste (tabell)');
  });
  it('Should be possible to select multiple rows', () => {
    cy.findAllByRole('cell', { name: 'Johanne' }).last().parent().click(); /*[1].parent().click();*/
    cy.findAllByRole('cell', { name: 'Kari' }).last().parent().click();
    cy.findAllByRole('cell', { name: 'Johanne' }).last().parent().findByRole('checkbox').should('be.checked');
    cy.findAllByRole('cell', { name: 'Kari' }).last().parent().findByRole('checkbox').should('be.checked');
  });

  it('Should be possible to deselect rows', () => {
    cy.findAllByRole('cell', { name: 'Johanne' }).last().parent().click();
    cy.findAllByRole('cell', { name: 'Kari' }).last().parent().click();
    cy.findAllByRole('cell', { name: 'Johanne' }).last().parent().click();
    cy.findAllByRole('cell', { name: 'Kari' }).last().parent().findByRole('checkbox').should('be.checked');
    cy.findAllByRole('cell', { name: 'Johanne' }).last().parent().findByRole('checkbox').should('not.be.checked');
  });

  it('Selections in list should apply to RepeatingGroup', () => {
    cy.findAllByRole('cell', { name: 'Johanne' }).last().parent().click();
    cy.findAllByRole('cell', { name: 'Kari' }).last().parent().click();
    cy.findAllByRole('cell', { name: 'Johanne' }).last().parent().click();

    cy.findAllByRole('cell', { name: 'Kari' }).last().should('exist');
  });

  it('Removing from RepeatingGroup should deselect from List', () => {
    cy.findAllByRole('cell', { name: 'Kari' }).last().parent().click();
    cy.findAllByRole('cell', { name: 'Kari' }).last().parent().findByRole('checkbox').should('be.checked');

    cy.findAllByRole('cell', { name: 'Kari' }).last().parent().contains('td', 'Slett').findByRole('button').click();

    cy.findAllByRole('cell', { name: 'Kari' }).last().parent().findByRole('checkbox').should('not.be.checked');
  });

  it('Deselecting in List should remove from RepeatingGroup', () => {
    cy.findAllByRole('cell', { name: 'Kari' }).last().parent().click();
    cy.findAllByRole('cell', { name: 'Kari' }).last().parent().findByRole('checkbox').should('be.checked');
    cy.findAllByRole('cell', { name: 'Kari' }).last().parent().contains('td', 'Rediger').findByRole('button').click();
    cy.findByRole('textbox', { name: /Surname/ }).type('Olsen');
    cy.findAllByRole('button', { name: /Lagre og lukk/ })
      .first()
      .click();
    cy.findAllByRole('cell', { name: 'Kari' }).last().parent().contains('td', 'Olsen');
    cy.findAllByRole('cell', { name: 'Kari' }).last().parent().click();
    cy.get('div[data-componentid*="group-RepeatingGroupListWithCheckboxes"]').should('not.exist');
  });
});
