describe('Tabs', () => {
  beforeEach(() => {
    cy.goto('changename');
  });

  it('Displays the correct tabs and default tab content', () => {
    cy.findByRole('tablist').children().should('have.length', 2);

    const tab1 = /Nytt mellomnavn/i;
    cy.findByRole('tab', { name: tab1 }).invoke('attr', 'aria-selected').should('equal', 'true');
    cy.findByRole('tab', { name: tab1 }).findByAltText('Nytt mellomnavn').should('exist'); // Check if icon is present
    cy.findByRole('tab', { name: tab1 }).should('have.text', 'Nytt mellomnavn'); // check if text is present

    cy.findByRole('tab', { name: 'Nytt etternavn' });

    cy.get('label').should('contain.text', 'Nytt mellomnavn');
    cy.findByRole('tabpanel').should('contain.text', 'Nytt mellomnavn');
  });

  it('Displays the correct tab content when clicking on a tab', () => {
    cy.findByRole('tablist').children().should('have.length', 2);
    cy.findByRole('tab', { name: 'Nytt etternavn' }).invoke('attr', 'aria-selected').should('equal', 'false');

    cy.findByRole('tab', { name: 'Nytt etternavn' }).click();
    cy.findByRole('tab', { name: 'Nytt etternavn' }).invoke('attr', 'aria-selected').should('equal', 'true');
    cy.findByRole('tabpanel').findByRole('textbox').should('exist');
  });

  it('Navigates to the correct tab when clicking on a validation error of an input field in that tab', () => {
    cy.findByRole('tablist').children().should('have.length', 2);
    cy.findByRole('tab', { name: 'Nytt etternavn' }).invoke('attr', 'aria-selected').should('equal', 'false');

    cy.navPage('grid').click();
    cy.findByRole('button', { name: 'Send inn' }).click();
    cy.findByText('Du må fylle ut nytt etternavn').click();
    cy.getCurrentPageId().should('equal', 'form');
    cy.findByRole('tab', { name: 'Nytt etternavn' }).invoke('attr', 'aria-selected').should('equal', 'true');
    cy.findByRole('tabpanel').findByRole('textbox').should('exist');
    cy.focused().should('have.attr', 'role', 'textbox');
  });
});
