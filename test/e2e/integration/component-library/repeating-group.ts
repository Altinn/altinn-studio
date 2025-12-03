import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Group summary test', () => {
  it('Renders the different options for add buttons correctly', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Repeterende gruppe');
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
    cy.interceptLayout('ComponentLayouts', (component) => {
      if (component.type === 'RepeatingGroup' && component.id === 'RepeatingGroup') {
        component.tableColumns = {
          'RepeatingGroup-Input-Name': {
            hidden: ['equals', 0, 0],
          },
        };
      }
    });

    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Repeterende gruppe');

    const nameInput = 'Test navn';
    const pointsInput = '10';
    const dateInput = '24.11.2025';

    cy.findAllByRole('button', { name: /Legg til ny/ })
      .first()
      .click();
    cy.findByRole('textbox', { name: /Navn/ }).type(nameInput);
    cy.findByRole('textbox', { name: /Poeng/ }).type(pointsInput);
    cy.findByRole('textbox', { name: /Dato/ }).type(dateInput);
    cy.findAllByRole('button', { name: /Lagre og lukk/ })
      .first()
      .click();

    const name2Input = 'Test2 navn';
    const points2Input = '20';
    const date2Input = '25.11.2025';

    cy.findAllByRole('button', { name: /Legg til ny/ })
      .first()
      .click();

    cy.findByRole('textbox', { name: /Navn/ }).type(name2Input);
    cy.findByRole('textbox', { name: /Poeng/ }).type(points2Input);
    cy.findByRole('textbox', { name: /Dato/ }).type(date2Input);
    cy.findAllByRole('button', { name: /Lagre og lukk/ })
      .first()
      .click();

    cy.get('div[data-testid="group-RepeatingGroup"] > table').within(() => {
      cy.findByRole('columnheader', { name: /Navn/ }).should('not.exist');
    });
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
});
