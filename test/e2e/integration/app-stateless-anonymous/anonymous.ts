import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Anonymous (stateless)', () => {
  beforeEach(() => {
    cy.intercept('**/api/layoutsettings/stateless').as('getLayoutStateless');
    cy.startAppInstance(appFrontend.apps.anonymousStateless, { user: null });
    cy.wait('@getLayoutStateless');
    cy.get(appFrontend.stateless.name).should('exist').and('be.visible');
  });

  it('Prefill from data processing is fetched', () => {
    cy.get('body').should('have.css', 'background-color', 'rgb(239, 239, 239)');
    cy.get(appFrontend.closeButton).should('not.exist');
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

  it('should cancel previous requests when changing answers', () => {
    // Do not remove the delay, it's added to ensure that the test has time to cancel the request
    cy.intercept('**/data/anonymous?dataType=default', { delay: 200 }).as('postDefault');
    cy.get(appFrontend.stateless.name).type('test');
    cy.get('label:contains("kvinne")').click();
    cy.get('label:contains("mann")').click();
    cy.get('@console.warn').should('have.been.calledWith', 'Request aborted due to saga cancellation');
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
    cy.snapshot('anonymous:iframe');
  });
});
