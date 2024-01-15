describe('Language', () => {
  it('should not crash if language is not specified', () => {
    cy.goto('changename');
    cy.intercept('GET', '**/profile/user', {
      body: {
        userId: 10000,
        userName: 'user-90155202001',
        externalIdentity: null,
        phoneNumber: null,
        email: 'mandolin.sentral@altinnstudiotestusers.com',
        partyId: 600000,
        party: {
          partyId: 600000,
          partyTypeName: 'person',
          orgNumber: null,
          ssn: '09844797998',
          unitType: null,
          name: 'SENTRAL MANDOLIN',
          isDeleted: false,
          onlyHierarchyElementWithNoAccess: false,
          person: {
            ssn: '09844797998',
            name: 'SENTRAL MANDOLIN',
            firstName: 'SENTRAL',
            middleName: null,
            lastName: 'MANDOLIN',
            telephoneNumber: null,
            mobileNumber: null,
            mailingAddress: null,
            mailingPostalCode: null,
            mailingPostalCity: null,
            addressMunicipalNumber: '3820',
            addressMunicipalName: null,
            addressStreetName: null,
            addressHouseNumber: '95',
            addressHouseLetter: '1001',
            addressPostalCode: null,
            addressCity: 'SELJORD',
            dateOfDeath: null,
          },
          organization: null,
          childParties: null,
        },
        userType: 'none',
        profileSettingPreference: {
          language: null,
          preSelectedPartyId: 0,
          doNotPromptForParty: false,
        },
      },
    }).as('profile');
    cy.intercept('GET', '**/texts/nb').as('texts');

    cy.wait('@profile');
    cy.wait('@texts');
    cy.findByRole('heading', { name: 'Ukjent feil' }).should('not.exist');
  });
});
