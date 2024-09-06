import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Group summary test', () => {
  beforeEach(() => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Repeterende gruppe');
  });

  it('Fills in an input in the repeating group, the text appears in summary', () => {
    const inputValue = 'Test input for group';

    cy.findAllByRole('button', { name: /Legg til ny/ })
      .first()
      .click();
    cy.findByRole('textbox', { name: /Navn/ }).type(inputValue);

    cy.get('div[data-testid="summary-repeating-group-component"]')
      .first()
      .within(() => {
        cy.contains('span', inputValue).should('exist');
      });
  });

  it('Fills in an input in the nested repeating group, the text appears in summary', () => {
    const inputValue = 'Test input inside nested repeating group';

    cy.findAllByRole('button', { name: /Legg til ny/ })
      .last()
      .click();
    cy.findAllByRole('button', { name: /Legg til ny/ })
      .last()
      .click();
    cy.findByRole('textbox', { name: /Bilmerke/ }).type(inputValue);

    cy.get('div[data-testid="summary-repeating-group-component"]')
      .last()
      .within(() => {
        cy.contains('span', inputValue).should('exist');
      });
  });

  it('Displays validation messages for the repeating group in summary', () => {
    const validationMessage = 'Maks 3 rader er tillatt';
    cy.findAllByRole('button', { name: /Legg til ny/ })
      .last()
      .click();
    cy.findAllByRole('button', { name: /Lagre og lukk/ })
      .first()
      .click();
    cy.findAllByRole('button', { name: /Legg til ny/ })
      .last()
      .click();
    cy.findAllByRole('button', { name: /Lagre og lukk/ })
      .first()
      .click();
    cy.findAllByRole('button', { name: /Legg til ny/ })
      .last()
      .click();
    cy.findAllByRole('button', { name: /Lagre og lukk/ })
      .first()
      .click();
    cy.findAllByRole('button', { name: /Legg til ny/ })
      .last()
      .click();

    cy.get('div[data-testid="summary-repeating-group-component"]')
      .last()
      .within(() => {
        cy.contains('span', validationMessage).should('exist');
      });
  });
});
