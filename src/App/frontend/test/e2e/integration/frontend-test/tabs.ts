describe('Tabs', () => {
  beforeEach(() => {
    cy.goto('changename');
  });

  it('Tabs component should work', () => {
    // Has correct number of tabs
    cy.findByRole('tablist').children().should('have.length', 2);

    // Displays the correct tabs and default tab content
    const tab1 = /Nytt mellomnavn/i;
    cy.findByRole('tab', { name: tab1 }).invoke('attr', 'aria-selected').should('equal', 'true');
    cy.findByRole('tab', { name: tab1 }).findByAltText('').should('exist'); // Check if icon is present
    cy.findByRole('tab', { name: tab1 }).should('have.text', 'Nytt mellomnavn'); // check if text is present

    // Regression test for one time when all tabs were visible at the same time
    cy.findAllByRole('tabpanel').should('have.length', 1);
    cy.get('#form-content-newMiddleName').should('be.visible');
    cy.get('#form-content-newLastName').should('not.exist');

    cy.findByRole('textbox', { name: /Nytt mellomnavn/i });

    cy.get('label').should('contain.text', 'Nytt mellomnavn');
    cy.findByRole('tabpanel').should('contain.text', 'Nytt mellomnavn');

    // Displays the correct tab content when clicking on a tab
    cy.findByRole('textbox', { name: /Nytt mellomnavn/i }).should('exist');
    cy.findByRole('textbox', { name: /Nytt etternavn/i }).should('not.exist');
    cy.findByRole('tab', { name: /nytt etternavn/i })
      .invoke('attr', 'aria-selected')
      .should('equal', 'false');

    cy.findByRole('tab', { name: /nytt etternavn/i }).click();

    cy.findByRole('tab', { name: /nytt etternavn/i })
      .invoke('attr', 'aria-selected')
      .should('equal', 'true');
    cy.findByRole('textbox', { name: /Nytt mellomnavn/i }).should('not.exist');
    cy.findByRole('textbox', { name: /Nytt etternavn/i }).should('exist');

    cy.findByRole('tab', { name: /nytt mellomnavn/i }).click();

    // Navigates to the correct tab when clicking on a validation error of an input field in that tab
    cy.findByRole('tab', { name: /nytt etternavn/i })
      .invoke('attr', 'aria-selected')
      .should('equal', 'false');

    cy.gotoNavPage('grid');
    cy.findByRole('button', { name: 'Send inn' }).click();
    cy.findByRole('button', { name: /du må fylle ut nytt etternavn/i }).click();

    cy.findByRole('tab', { name: /nytt etternavn/i })
      .invoke('attr', 'aria-selected')
      .should('equal', 'true');
    cy.findByRole('textbox', { name: /Nytt etternavn/i })
      .should('exist')
      .should('be.focused');
  });
});
