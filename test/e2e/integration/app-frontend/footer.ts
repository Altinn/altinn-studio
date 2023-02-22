import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { mockFooter } from 'test/e2e/support/footer';

import type { IBackendFeaturesState } from 'src/shared/resources/applicationMetadata';

const appFrontend = new AppFrontend();

describe('Footer', () => {
  function simulateFooterFeature(value: boolean | undefined) {
    cy.intercept('GET', '**/applicationmetadata', (req) => {
      req.on('response', (res) => {
        res.body.features = {
          footer: value,
        } as IBackendFeaturesState;
      });
    });
  }

  it('Renders footer when app has it implemented', () => {
    simulateFooterFeature(true);
    cy.intercept('GET', '**/api/v1/footer', { statusCode: 200, body: mockFooter });
    cy.gotoAndComplete('message');
    cy.get('footer').should('exist').and('be.visible');
    cy.get('footer > div').eq(0).should('contain.text', 'Frontend Test').and('contain.text', 'Testdepartementet');
    cy.get('footer > div')
      .eq(1)
      .children('a')
      .invoke('attr', 'href')
      .should('eq', 'https://www.altinn.no/om-altinn/tilgjengelighet/');
    cy.get('footer > div').eq(2).children('a').invoke('attr', 'href').should('eq', 'mailto:hjelp@etaten.no');
    cy.get('footer > div').eq(3).children('a').invoke('attr', 'href').should('eq', 'tel:+4798765432');
  });
  [204, 404].forEach((statusCode) => {
    it(`Does not render footer when backend returns ${statusCode}`, () => {
      simulateFooterFeature(true);
      cy.intercept('GET', '**/api/v1/footer', { statusCode, body: null });
      cy.gotoAndComplete('message');
      cy.get(appFrontend.sendinButton).should('exist').and('be.visible'); // Make sure the page loads correctly
      cy.get('footer').should('not.exist');
    });
  });
  it('Does not fetch and render footer when featureflag is not set', () => {
    simulateFooterFeature(undefined);
    cy.intercept('GET', '**/api/v1/footer', { statusCode: 200, body: mockFooter });
    cy.gotoAndComplete('message');
    cy.get(appFrontend.sendinButton).should('exist').and('be.visible'); // Make sure the page loads correctly
    cy.get('footer').should('not.exist');
  });
});
