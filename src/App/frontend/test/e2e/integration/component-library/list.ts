import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('List component', () => {
  it('Adds and removes data properly when using group and soft deletion', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Liste (tabell)');

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

    // Checking 'Kari' again should bring back the surname
    cy.get(list).findByRole('cell', { name: 'Kari' }).parent().click();
    cy.get(repGroup).findAllByRole('row').should('have.length', 2); // Header + 1 row
    cy.get(repGroup).findByRole('cell', { name: 'Kari' }).should('exist');
    cy.get(repGroup).findAllByRole('cell', { name: 'Olsen' }).should('exist');

    // Testing summaries
    cy.get(list).findByRole('cell', { name: 'Johanne' }).parent().click();
    cy.get(repGroup).findAllByRole('row').should('have.length', 3); // Header + 2 rows
    cy.get(summary1).should('contain.text', 'Johanne, Kari');

    // Summary2 is a bit more tricky to find
    cy.get('table').last().should('have.not.have.attr', 'id');
    cy.get('table').last().findAllByRole('row').should('have.length', 3); // Header + 2 row

    // Find Kåre, make sure he's selected in both summaries
    cy.get(list).findByRole('cell', { name: 'Kåre' }).parent().click();
    cy.get(repGroup).findAllByRole('row').should('have.length', 4); // Header + 3 rows
    cy.get(summary1).should('contain.text', 'Johanne, Kari, Kåre');
    cy.get('table').last().findAllByRole('row').should('have.length', 4); // Header + 3 rows

    // Uncheck Kåre again, make sure he's no longer in any summaries
    cy.get(list).findByRole('cell', { name: 'Kåre' }).parent().click();
    cy.get(repGroup).findAllByRole('row').should('have.length', 3); // Header + 2 rows
    cy.get(summary1).should('contain.text', 'Johanne, Kari');
    cy.get('table').last().findAllByRole('row').should('have.length', 3); // Header + 2 rows
  });

  it('Adds and removes data properly when using group and hard deletion', () => {
    cy.interceptLayout('ComponentLayouts', (component) => {
      if (component.type === 'List' && component.id === 'ListPage-ListWithCheckboxesComponent') {
        component.deletionStrategy = 'hard';
        if (component.dataModelBindings) {
          component.dataModelBindings.checked = undefined;
        }
      }
    });
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Liste (tabell)');
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

    // Checking 'Kari' again should not bring back the surname
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

    // Find Kåre, make sure he's selected in both summaries
    cy.get(list).findByRole('cell', { name: 'Kåre' }).parent().click();
    cy.get(repGroup).findAllByRole('row').should('have.length', 4); // Header + 3 rows
    cy.get(summary1).should('contain.text', 'Kari, Johanne, Kåre');
    cy.get('table').last().findAllByRole('row').should('have.length', 4); // Header + 3 rows

    // Uncheck Kåre again, make sure he's no longer in any summaries
    cy.get(list).findByRole('cell', { name: 'Kåre' }).parent().click();
    cy.get(repGroup).findAllByRole('row').should('have.length', 3); // Header + 2 rows
    cy.get(summary1).should('contain.text', 'Kari, Johanne');
    cy.get('table').last().findAllByRole('row').should('have.length', 3); // Header + 2 rows
  });

  it('Required validation shows when List is selected with simpleBinding', () => {
    cy.interceptLayout('ComponentLayouts', (component) => {
      if (component.type === 'List' && component.id === 'ListPage-ListComponent') {
        component.required = true;
      }
    });
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Oppsummering 2.0');
    cy.findByRole('button', { name: 'Send inn' }).click();
    cy.gotoNavPage('Liste (tabell)');

    const list = '[data-componentid=ListPage-ListComponent]';
    cy.get(list).contains('span', 'Du må fylle ut Min Liste').should('exist');

    const listText = 'Kari';
    cy.get(list).findByRole('cell', { name: listText }).parent().click();
    cy.get(list).contains('span', 'Du må fylle ut Min Liste').should('not.exist');
  });
  it('Required validation shows when List is selected with group and soft delete', () => {
    cy.interceptLayout('ComponentLayouts', (component) => {
      if (component.type === 'List' && component.id === 'ListPage-ListWithCheckboxesComponent') {
        component.required = true;
      }
    });
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Oppsummering 2.0');
    cy.findByRole('button', { name: 'Send inn' }).click();
    cy.gotoNavPage('Liste (tabell)');

    const list = '[data-componentid=ListPage-ListWithCheckboxesComponent]';

    cy.get(list).contains('span', 'Du må fylle ut Min Liste med Checkboxer').should('exist');

    const listText = 'Kari';
    cy.get(list).findByRole('cell', { name: listText }).parent().click();
    cy.get(list).contains('span', 'Du må fylle ut Min Liste med Checkboxer').should('not.exist');
  });
  it('Required validation shows when List is selected with group and hard delete', () => {
    cy.interceptLayout('ComponentLayouts', (component) => {
      if (component.type === 'List' && component.id === 'ListPage-ListWithCheckboxesComponent') {
        component.required = true;
        component.deletionStrategy = 'hard';
        if (component.dataModelBindings) {
          component.dataModelBindings.checked = undefined;
        }
      }
    });
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Oppsummering 2.0');
    cy.findByRole('button', { name: 'Send inn' }).click();
    cy.gotoNavPage('Liste (tabell)');

    const list = '[data-componentid=ListPage-ListWithCheckboxesComponent]';

    cy.get(list).contains('span', 'Du må fylle ut Min Liste med Checkboxer').should('exist');

    const listText = 'Kari';
    cy.get(list).findByRole('cell', { name: listText }).parent().click();
    cy.get(list).contains('span', 'Du må fylle ut Min Liste med Checkboxer').should('not.exist');
  });
});
