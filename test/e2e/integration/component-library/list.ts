import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('List component', () => {
  beforeEach(() => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Liste (tabell)');
  });

  it('Should be possible to select multiple rows', () => {
    const list = '[data-componentid=ListPage-ListWithCheckboxesComponent]';
    const repGroup = '[data-componentid=RepeatingGroupListWithCheckboxes]';
    const summary1 = '[data-componentid=ListPage-Summary-Component2]';

    cy.get(list).findByRole('cell', { name: 'Johanne' }).parent().click();
    cy.get(list).findByRole('cell', { name: 'Kari' }).parent().click();
    cy.get(list).findByRole('cell', { name: 'Johanne' }).parent().findByRole('checkbox').should('be.checked');
    cy.get(list).findByRole('cell', { name: 'Kari' }).parent().findByRole('checkbox').should('be.checked');

    // Unchecking
    cy.get(list).findByRole('cell', { name: 'Johanne' }).parent().click();
    cy.get(list).findByRole('cell', { name: 'Kari' }).parent().findByRole('checkbox').should('be.checked');
    cy.get(list).findByRole('cell', { name: 'Johanne' }).parent().findByRole('checkbox').should('not.be.checked');

    // Should be visible in RepeatingGroup
    cy.get(repGroup).findByRole('cell', { name: 'Kari' }).should('exist');

    // Removing from RepeatingGroup should deselect from List
    cy.get(repGroup).findAllByRole('row').should('have.length', 2); // Header + 1 row
    cy.get(repGroup)
      .findByRole('button', { name: /^Slett/ })
      .click();
    cy.get(list).findByRole('cell', { name: 'Kari' }).parent().findByRole('checkbox').should('not.be.checked');

    // Deleting from List should remove from RepeatingGroup (observe that data is lost)
    cy.get(list).findByRole('cell', { name: 'Kari' }).parent().click();
    cy.get(list).findByRole('cell', { name: 'Kari' }).parent().findByRole('checkbox').should('be.checked');
    cy.get(repGroup).findAllByRole('row').should('have.length', 2); // Header + 1 row
    cy.get(repGroup)
      .findByRole('button', { name: /^Rediger/ })
      .click();
    cy.findByRole('textbox', { name: /Surname/ }).type('Olsen');
    cy.findAllByRole('button', { name: /Lagre og lukk/ })
      .last()
      .click();
    cy.get(repGroup).findByRole('cell', { name: 'Kari' }).parent().contains('td', 'Olsen');
    cy.get(list).findByRole('cell', { name: 'Kari' }).parent().click();

    cy.get(repGroup).findAllByRole('row').should('have.length', 0);

    // Checking 'Kari' again does not bring back the surname
    cy.get(list).findByRole('cell', { name: 'Kari' }).parent().click();
    cy.get(repGroup).findAllByRole('row').should('have.length', 2); // Header + 1 row
    cy.get(repGroup).findByRole('cell', { name: 'Kari' }).should('exist');
    cy.get(repGroup).findAllByRole('cell', { name: 'Olsen' }).should('not.exist');

    // Testing summaries
    cy.get(list).findByRole('cell', { name: 'Johanne' }).parent().click();
    cy.get(repGroup).findAllByRole('row').should('have.length', 3); // Header + 2 rows
    cy.get(summary1).should('contain.text', 'Kari, Johanne');

    // Summary2 is a bit more tricky to find
    cy.get('table').last().should('have.not.have.attr', 'id');
    cy.get('table').last().findAllByRole('row').should('have.length', 3); // Header + 2 row
  });
});
