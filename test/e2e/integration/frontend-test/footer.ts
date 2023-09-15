import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Footer', () => {
  it('Renders footer when app has it implemented', () => {
    cy.goto('message');
    cy.get('footer').should('exist').and('be.visible');
    cy.get('footer > div > div').eq(0).should('contain.text', 'Frontend Test').and('contain.text', 'Testdepartementet');
    cy.get('footer > div > div')
      .eq(1)
      .children('a')
      .invoke('attr', 'href')
      .should('eq', 'https://www.altinn.no/om-altinn/tilgjengelighet/');
    cy.get('footer > div > div').eq(2).children('a').invoke('attr', 'href').should('eq', 'mailto:hjelp@etaten.no');
    cy.get('footer > div > div').eq(3).children('a').invoke('attr', 'href').should('eq', 'tel:+4798765432');
    cy.snapshot('footer');
  });

  it('Does not render footer when backend returns 204', () => {
    cy.intercept('GET', '**/api/v1/footer', { statusCode: 204, body: null });
    cy.goto('message');
    cy.get(appFrontend.sendinButton).should('exist').and('be.visible'); // Make sure the page loads correctly
    cy.get('footer').should('not.exist');
  });
});
