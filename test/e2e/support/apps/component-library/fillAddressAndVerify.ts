export const fillInAddressAndVerify = (address: string, co: string, zip: string, houseNumber: string) => {
  cy.gotoNavPage('Adresse');
  cy.get('#address_address_AddressPage-Address').type(address);
  cy.get('#address_care_of_AddressPage-Address').type(co);
  cy.get('#address_zip_code_AddressPage-Address').type(zip);
  cy.get('#address_house_number_AddressPage-Address').type(houseNumber);

  // Verify Gateadresse (Street address)
  cy.get('[data-testid="summary-single-value-component"]').eq(0).find('span.ds-paragraph').should('have.text', address);

  // Verify C/O eller annan tilleggsadresse (C/O or additional address)
  cy.get('[data-testid="summary-single-value-component"]').eq(1).find('span.ds-paragraph').should('have.text', co);

  // Verify Postnr (Postal code)
  cy.get('[data-testid="summary-single-value-component"]').eq(2).find('span.ds-paragraph').should('have.text', zip);

  // Verify Poststad (City)
  cy.get('[data-testid="summary-single-value-component"]').eq(3).find('span.ds-paragraph').should('have.text', 'OSLO');

  // Verify Bustadnummer (House number)
  cy.get('[data-testid="summary-single-value-component"]')
    .eq(4)
    .find('span.ds-paragraph')
    .should('have.text', houseNumber);
};
