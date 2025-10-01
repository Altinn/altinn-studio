import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Anonymous (stateless)', () => {
  beforeEach(() => {
    cy.intercept('**/api/layoutsettings/stateless').as('getLayoutStateless');
    cy.startAppInstance(appFrontend.apps.anonymousStateless, { cyUser: null });
    cy.wait('@getLayoutStateless');
    cy.get(appFrontend.stateless.name).should('exist').and('be.visible');
  });

  it('Prefill from data processing is fetched', () => {
    cy.get('body').should('have.css', 'background-color', 'rgb(239, 239, 239)');
    cy.findByRole('link', { name: /tilbake til innboks/i }).should('not.exist');
    cy.get(appFrontend.profileIconButton).should('not.exist');
    cy.get(appFrontend.stateless.name).invoke('val').should('be.empty');
    cy.get(appFrontend.stateless.number).should('have.value', '1234');
    cy.get(appFrontend.header)
      .should('contain.text', appFrontend.apps.anonymousStateless)
      .and('contain.text', texts.ttd);
  });

  it('should trigger data processing on changes in form fields', () => {
    cy.get(appFrontend.stateless.name).type('test');
    cy.get(appFrontend.stateless.name).blur();
    cy.get(appFrontend.stateless.name).should('have.value', 'automation');
    cy.get(appFrontend.stateless.idnummer2).should('have.value', '1234567890');
  });

  it('rapid form data updates should respect the last user action', () => {
    // Delaying the save operation makes sure we have time to trigger multiple updates
    cy.intercept('**/data/anonymous?dataType=default**', { delay: 200 }).as('postData');
    cy.findByRole('radio', { name: 'kvinne' }).click();
    cy.findByRole('radio', { name: 'kvinne' }).blur();
    // Wait for @postData to start, but do not wait for it to finish
    cy.waitUntil(() => cy.get('@postData.all').then((requests) => requests.length > 0));
    cy.findByRole('radio', { name: 'mann' }).click();
    cy.waitUntil(() => cy.get('@postData.all').then((requests) => requests.length == 2));
    cy.wait('@postData');
    cy.findByRole('radio', { name: 'mann' }).should('be.checked');
  });

  it('should render iframe with srcdoc and the heading text should be "The red title is rendered within an iframe"', () => {
    cy.get('iframe').should('exist');
    cy.get('iframe').should('have.attr', 'srcdoc');

    // access the content of the iframe
    cy.get('iframe')
      .its('0.contentDocument.body')
      .should('not.be.empty')
      .then(cy.wrap)
      .within(() => {
        cy.get('h1').contains('The red title is rendered within an iframe');
      });
    cy.visualTesting('anonymous:iframe');
  });
});
