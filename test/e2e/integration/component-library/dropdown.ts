import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Dropdown component', () => {
  it('Renders the summary2 component with correct text for Dropdown', () => {
    const testText = 'Moped';

    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('DropdownPage');
    cy.get('#form-content-DropdownPage-RadioButtons').click();
    cy.get('div[role="listbox"]').contains('span', testText).click();
    cy.get('[data-testid="summary-single-value-component"]')
      .eq(0)
      .find('span.fds-paragraph')
      .should('have.text', testText);
  });
});
