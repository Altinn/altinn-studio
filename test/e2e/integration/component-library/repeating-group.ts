import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import type { CompExternal } from 'src/layout/layout';

const appFrontend = new AppFrontend();

describe('Group summary test', () => {
  it('Evaluates readOnly expressions inside nested groups in Summary2', () => {
    cy.interceptLayout('ComponentLayouts', (component) => {
      if (component.type === 'Input' && component.id === 'RepeatingGroup-With-Group-Input-Name') {
        component.readOnly = [
          'or',
          ['equals', ['dataModel', 'repeatingGroup.points'], '1'],
          ['equals', ['dataModel', 'repeatingGroup.points'], '8'],
        ];
      }
    });

    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Repeterende gruppe');

    ['1', '8', '2'].forEach((points, index) => {
      cy.findAllByRole('button', { name: /Legg til ny/ })
        .eq(1)
        .click();
      cy.findByRole('textbox', { name: /Navn/ }).type(`Navn ${index}`);
      cy.findByRole('textbox', { name: /Poeng/ }).type(points);
      cy.findByRole('textbox', { name: /Navn/ }).should(points === '2' ? 'not.have.attr' : 'have.attr', 'readonly');
      cy.findAllByRole('button', { name: /Lagre og lukk/ })
        .first()
        .click();
    });

    const summary = '[data-componentid="RepeatingGroup-With-Group-Summary2"]';
    cy.get(summary).should('contain.text', 'Navn 0').and('contain.text', 'Navn 1').and('contain.text', 'Navn 2');
    cy.get(`${summary} button[data-target-id="RepeatingGroup-With-Group-Input-Name-0"]`).should('not.exist');
    cy.get(`${summary} button[data-target-id="RepeatingGroup-With-Group-Input-Name-1"]`).should('not.exist');
    cy.get(`${summary} button[data-target-id="RepeatingGroup-With-Group-Input-Name-2"]`).should('be.visible');
    cy.get('@window.logError').should('not.be.calledWithMatch', 'Cannot lookup dataType undefined');
  });

  it('Renders the different options for add buttons and limits cell text without truncating headers', () => {
    const tableTitle = 'A long column heading that must remain fully visible. '.repeat(8).trim();
    cy.interceptLayout('ComponentLayouts', (component) => {
      if (component.type === 'RepeatingGroup' && component.id === 'RepeatingGroup') {
        component.tableColumns = {
          'RepeatingGroup-Input-Name': { width: '160px', textOverflow: { maxHeight: 4 } },
        };
      }
      if (component.type === 'Input' && component.id === 'RepeatingGroup-Input-Name') {
        component.textResourceBindings = { ...component.textResourceBindings, tableTitle };
      }
    });
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Repeterende gruppe');
    const inputValue = 'Long cell content that should be truncated. '.repeat(12).trim();

    cy.findAllByRole('button', { name: /Legg til ny/ })
      .first()
      .click();
    cy.findByRole('textbox', { name: /Navn/ }).type(inputValue);
    cy.findAllByRole('button', { name: /Lagre og lukk/ })
      .first()
      .click();

    cy.get('[data-testid="group-RepeatingGroup"] > table').within(() => {
      cy.findByRole('columnheader', { name: tableTitle })
        .children('span')
        .should(($header) => {
          const header = $header[0];
          const lineHeight = parseFloat(getComputedStyle(header).lineHeight);
          expect(header.clientHeight, 'long header remains taller than four lines').to.be.greaterThan(4 * lineHeight);
          expect(header.scrollHeight, 'header is not clipped').to.equal(header.clientHeight);
        });
      cy.findByRole('cell', { name: inputValue })
        .children('span')
        .first()
        .should(($content) => {
          const content = $content[0];
          const lineHeight = parseFloat(getComputedStyle(content).lineHeight);
          expect(content.clientHeight, 'cell is limited to four lines').to.be.closeTo(4 * lineHeight, 1);
          expect(content.scrollHeight, 'content exceeds the visible lines').to.be.greaterThan(content.clientHeight);
        });
    });
    cy.get('#add-button-RepeatingGroup').should('be.visible');
    cy.visualTesting('repeatingGroupAddButtons');
  });

  it('Fills in an input in the repeating group, the text appears in summary', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Repeterende gruppe');
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

  it('Should hide column when tableColumns hidden is set on a field', () => {
    cy.interceptLayout(
      'ComponentLayouts',
      (component) => {
        if (component.type === 'RepeatingGroup' && component.id === 'RepeatingGroup') {
          component.tableColumns = {
            'RepeatingGroup-Input-Name': {
              hidden: ['equals', ['component', 'RepeatingGroupPage-RadioButtons'], 'moped'],
            },
          };
          component.rowsAfter = [{ header: true, cells: [{ text: 'Kol1' }, { text: 'Kol2' }, { text: 'Kol3' }] }];
        }
      },
      (layout) => {
        layout['RepeatingGroupPage'].data.layout.splice(1, 0, {
          id: 'RepeatingGroupPage-RadioButtons',
          type: 'RadioButtons',
          textResourceBindings: { title: 'Velg moped for å skjule en kolonne' },
          dataModelBindings: { simpleBinding: { field: 'radioButtonInput', dataType: 'model' } },
          options: [
            { label: 'Bil', value: 'bil' },
            { label: 'Moped', value: 'moped' },
            { label: 'Traktor', value: 'traktor' },
            { label: 'Båt', value: 'baat' },
          ],
        } satisfies CompExternal);
      },
    );

    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Repeterende gruppe');

    const rowsToAdd = [
      { navn: 'Testnavn1', poeng: '10', dato: '24.11.2025' },
      { navn: 'Testnavn2', poeng: '20', dato: '25.11.2025' },
    ];

    for (const row of rowsToAdd) {
      cy.findAllByRole('button', { name: /Legg til ny/ })
        .first()
        .click();
      cy.findByRole('textbox', { name: /Navn/ }).type(row.navn);
      cy.findByRole('textbox', { name: /Poeng/ }).type(row.poeng);
      cy.findByRole('textbox', { name: /Dato/ }).type(row.dato);
      cy.findAllByRole('button', { name: /Lagre og lukk/ })
        .first()
        .click();
    }

    cy.get('div[data-testid="group-RepeatingGroup"] > table').within(() => {
      cy.findByRole('columnheader', { name: /Navn/ }).should('be.visible');
      cy.findByRole('columnheader', { name: /Kol1/ }).should('be.visible');
    });
    cy.get('[data-componentid="RepeatingGroup-Summary"]')
      .find('[data-testid="summary-item-compact"]')
      .should('have.length', rowsToAdd.length * 3);
    cy.get('[data-testid="summary-repeating-group-component"] > table').should('contain.text', 'Testnavn1');
    cy.get('[data-testid="summary-repeating-group-component"] > table').should('contain.text', 'Testnavn2');

    cy.findByRole('radio', { name: 'Moped' }).check();

    cy.get('div[data-testid="group-RepeatingGroup"] > table').within(() => {
      cy.findByRole('columnheader', { name: /Kol2/ }).should('be.visible');
      cy.findByRole('columnheader', { name: /Navn/ }).should('not.exist');
      cy.findByRole('columnheader', { name: /Kol1/ }).should('not.exist');
    });

    cy.get('[data-componentid="RepeatingGroup-Summary"]')
      .find('[data-testid="summary-item-compact"]')
      .should('have.length', rowsToAdd.length * 2);

    cy.get('[data-testid="summary-repeating-group-component"] > table').should('contain.text', '24.11.2025');
    cy.get('[data-testid="summary-repeating-group-component"] > table').should('not.contain.text', 'Testnavn1');
    cy.get('[data-testid="summary-repeating-group-component"] > table').should('not.contain.text', 'Testnavn2');
  });

  it('Displays a summary for a filled repeating group in table', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Repeterende gruppe');
    const inputValue = 'Test input for group';
    const inputValue2 = 'Test input for group2';

    cy.findAllByRole('button', { name: /Legg til ny/ })
      .first()
      .click();
    cy.findByRole('textbox', { name: /Navn/ }).type(inputValue);
    cy.findAllByRole('button', { name: /Lagre og lukk/ })
      .first()
      .click();
    cy.findAllByRole('button', { name: /Legg til ny/ })
      .first()
      .click();
    cy.findByRole('textbox', { name: /Navn/ }).type(inputValue2);
    cy.findAllByRole('button', { name: /Lagre og lukk/ })
      .first()
      .click();

    cy.get('div[data-testid="summary-repeating-group-component"] > table').within(() => {
      cy.findAllByRole('row').should('have.length', 3);
      cy.findByRole('columnheader', { name: /Navn/ }).should('exist');
      cy.findAllByRole('cell', { name: inputValue }).should('exist');
      cy.findAllByRole('cell', { name: inputValue2 }).should('exist');
    });
  });

  it('Fills in an input in the nested repeating group, the text appears in summary', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Repeterende gruppe');
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
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Repeterende gruppe');
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

  it('Should hide edit buttons in Summary2 when edit.editButton is set to false', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Repeterende gruppe');

    // The first repeating group
    cy.findAllByRole('button', { name: /Legg til ny/ })
      .first()
      .click();
    cy.findByRole('textbox', { name: /Navn/ }).type('Test Navn 1');
    cy.findByRole('textbox', { name: /Poeng/ }).type('10');
    cy.findByRole('textbox', { name: /Dato/ }).type('01.01.2026');
    cy.findAllByRole('button', { name: /Lagre og lukk/ })
      .first()
      .click();

    // Repeating group with nested RepeatingGroup
    cy.findAllByRole('button', { name: /Legg til ny/ })
      .eq(2)
      .click();
    cy.findByRole('textbox', { name: /Navn/ }).type('Test Navn 2');
    cy.findByRole('textbox', { name: /Poeng/ }).type('20');
    cy.findByRole('textbox', { name: /Dato/ }).type('02.01.2026');

    // Nested repeating group
    cy.findAllByRole('button', { name: /Legg til ny/ })
      .last()
      .click();
    cy.findByRole('textbox', { name: /Bilmerke/ }).type('Toyota');
    cy.findByRole('textbox', { name: /Modell/ }).type('Corolla');
    cy.findByRole('textbox', { name: /Årsmodell/ }).type('2024');

    cy.findAllByRole('button', { name: /Lagre og lukk/ })
      .first()
      .click();

    cy.findAllByRole('button', { name: /Endre/ }).should('have.length', 16);
    cy.changeLayout((component) => {
      if (component.type === 'RepeatingGroup') {
        component.edit = component.edit ?? {};
        component.edit.editButton = false; // Hiding the edit button hides every edit button in summary
      }
    });

    // The remaining 3 ones are edit buttons for the whole repeating groups from legacy Summary
    cy.findAllByRole('button', { name: /Endre/ }).should('have.length', 3);

    cy.changeLayout((component) => {
      if (component.type === 'RepeatingGroup' && component.id === 'RepeatingGroup') {
        component.tableColumns = {
          'RepeatingGroup-Input-Points': {
            editInTable: true, // It can still be edited if editable in the table even when the edit button is gone
          },
        };
      }
      if (component.type === 'RepeatingGroup' && component.id === 'RepeatingGroup-With-RepeatingGroup') {
        component.tableColumns = {
          'RepeatingGroup-With-RepeatingGroup-Input-Points': {
            editInTable: true,
          },
        };
      }
    });

    cy.findAllByRole('button', { name: /Endre/ }).should('have.length', 3 + 3);
    cy.get('button[data-target-id="RepeatingGroup-Input-Points-0"]').should('have.length', 2);
    cy.get('button[data-target-id="RepeatingGroup-With-RepeatingGroup-Input-Points-0"]').should('have.length', 1);

    cy.changeLayout((component) => {
      if (component.type === 'Input' && component.id.match(/^RepeatingGroup-.*?Input-Points$/)) {
        component.readOnly = true; // No point in having an edit button for a readOnly component
      }
    });

    cy.findAllByRole('button', { name: /Endre/ }).should('have.length', 3);
    cy.get('button[data-target-id="RepeatingGroup-Input-Points-0"]').should('have.length', 0);
    cy.get('button[data-target-id="RepeatingGroup-With-RepeatingGroup-Input-Points-0"]').should('have.length', 0);
  });
});
