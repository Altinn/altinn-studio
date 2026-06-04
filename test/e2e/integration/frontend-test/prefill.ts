import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Tenor } from 'test/e2e/support/users';

const appFrontend = new AppFrontend();

describe('Prefill', () => {
  it('Check Prefill from register and readonly input', () => {
    const userFullName =
      Cypress.env('type') === 'localtest'
        ? Cypress.env('defaultFullName')
        : Tenor.users.saligBlomsterplante.reverseName.toUpperCase();

    cy.goto('changename');
    cy.get(appFrontend.changeOfName.currentName).then((name) => {
      cy.wrap(name).and('have.value', userFullName).and('have.attr', 'readonly');
    });
  });
});
