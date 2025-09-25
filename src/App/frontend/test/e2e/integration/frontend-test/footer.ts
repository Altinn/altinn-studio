import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Footer', () => {
  it('Renders footer when app has it implemented', () => {
    cy.goto('message');
    cy.get('footer > div').eq(0).should('contain.text', 'Frontend Test').and('contain.text', 'Testdepartementet');
    cy.findByRole('link', { name: /Tilgjengelighet/i }).should(
      'have.attr',
      'href',
      'https://info.altinn.no/om-altinn/tilgjengelighet/',
    );

    cy.findByRole('link', { name: /hjelp@etaten.no/i }).should('have.attr', 'href', 'mailto:hjelp@etaten.no');
    cy.findByRole('link', { name: /\+47 987 65 432/i }).should('have.attr', 'href', 'tel:+4798765432');
    cy.visualTesting('footer');
  });

  it('Does not render footer when backend returns 204', () => {
    cy.intercept('GET', '**/api/v1/footer', { statusCode: 204, body: null });
    cy.goto('message');
    cy.get(appFrontend.sendinButton).should('exist').and('be.visible'); // Make sure the page loads correctly
    cy.get('footer').should('not.exist');
  });
});
