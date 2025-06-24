import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Dropdown component', () => {
  it('Renders the summary2 component with correct text for Dropdown', () => {
    const testText = 'Moped';

    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Dropdown');
    cy.get('#form-content-DropdownPage-RadioButtons').click();
    cy.get('div[role="listbox"]').contains('span', testText).click();
    cy.get('[data-testid="summary-single-value-component"]')
      .eq(0)
      .find('span.ds-paragraph')
      .should('have.text', testText);
  });

  it('Retains focus after selecting a value in the dropdown', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Dropdown');
    cy.dsSelect('#DropdownPage-RadioButtons', 'Moped', false);
    cy.get('#DropdownPage-RadioButtons').should('have.value', 'Moped');
    cy.get('#DropdownPage-RadioButtons').should('have.focus');
  });
});
