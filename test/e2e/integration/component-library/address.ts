import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Address component', () => {
  it('Should focus the correct element when navigating from an error', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.get('ul#navigation-menu > li').last().click();
    cy.contains('button', 'Send inn').click();
    cy.contains('button', 'Du må fylle ut postnr').click();
    cy.url().should('include', '/Task_1/AddressPage');
    cy.get('input[data-bindingkey="zipCode"]').should('exist').and('have.focus');
  });

  it('Renders the summary2 component with correct text', () => {
    const address = 'Anders Gate 1';
    const co = 'C/O Jonas Støre';
    const zip = '0666';
    const houseNumber = 'U0101';

    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.get('#navigation-menu').find('button').contains('8. Adresse').click();
    cy.get('#address_address_AddressPage-Address').type(address);
    cy.get('#address_care_of_AddressPage-Address').type(co);
    cy.get('#address_zip_code_AddressPage-Address').type(zip);
    cy.get('#address_house_number_AddressPage-Address').type(houseNumber);

    // Verify Gateadresse (Street address)
    cy.get('[data-testid="summary-single-value-component"]')
      .eq(0)
      .find('span.fds-paragraph')
      .should('have.text', address);

    // Verify C/O eller annan tilleggsadresse (C/O or additional address)
    cy.get('[data-testid="summary-single-value-component"]').eq(1).find('span.fds-paragraph').should('have.text', co);

    // Verify Postnr (Postal code)
    cy.get('[data-testid="summary-single-value-component"]').eq(2).find('span.fds-paragraph').should('have.text', zip);

    // Verify Poststad (City)
    cy.get('[data-testid="summary-single-value-component"]')
      .eq(3)
      .find('span.fds-paragraph')
      .should('have.text', 'OSLO');

    // Verify Bustadnummer (House number)
    cy.get('[data-testid="summary-single-value-component"]')
      .eq(4)
      .find('span.fds-paragraph')
      .should('have.text', houseNumber);
  });

  it('should pass accessibility tests', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.findByRole('button', { name: /adresse/i }).click();
    cy.testWcag();
  });
});
