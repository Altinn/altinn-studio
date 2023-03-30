import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Dynamics', () => {
  it('Show and hide confirm name change checkbox on changing firstname', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName)

      .type('test')
      .then(() => {
        cy.get(appFrontend.changeOfName.newMiddleName).focus();
        cy.get(appFrontend.changeOfName.confirmChangeName).should('be.visible');
      });
    cy.get(appFrontend.changeOfName.newFirstName)
      .clear()
      .then(() => {
        cy.get(appFrontend.changeOfName.newMiddleName).focus();
        cy.get(appFrontend.changeOfName.confirmChangeName).should('not.exist');
      });
  });

  it('Show and hide name change reasons radio buttons', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('test').blur();
    cy.get(appFrontend.changeOfName.newLastName).type('test').blur();
    cy.get(appFrontend.changeOfName.confirmChangeName).find('input').dsCheck();
    cy.get(appFrontend.changeOfName.reasons).should('be.visible');
  });

  it('Remove validation message when field disappears', () => {
    cy.interceptLayout('changename', (component) => {
      if (component.id === 'newFirstName') {
        component.hidden = ['equals', 'hideFirstName', ['component', 'newLastName']];
      }
    });
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('test');
    cy.get(appFrontend.errorReport).should('contain.text', texts.testIsNotValidValue);
    cy.get(appFrontend.changeOfName.newLastName).type('hideFirstName');
    cy.get(appFrontend.errorReport).should('not.exist');
    cy.get(appFrontend.changeOfName.newLastName).clear();
    cy.get(appFrontend.changeOfName.newFirstName).should('be.visible');
    cy.get(appFrontend.errorReport).should('contain.text', texts.testIsNotValidValue);
  });

  it('Page interdependent dynamics with component lookups', () => {
    cy.interceptLayout(
      'changename',
      (component) => {
        if (component.id === 'newLastName') {
          // Hide the field using dynamics from the summary page
          component.hidden = ['equals', ['component', 'testInputOnSummary'], 1234];
        }
      },
      (layoutSet) => {
        // Hide summary page using dynamics from the form page
        layoutSet.summary.data.hidden = ['equals', ['component', 'newFirstName'], 'hideSummary'];

        const summaryComponents = [...layoutSet.summary.data.layout];
        const lastButton = summaryComponents.pop();
        layoutSet.summary.data.layout = [
          ...summaryComponents,
          {
            id: 'testInputOnSummary',
            type: 'Input',
            textResourceBindings: { title: 'Temporary field while testing' },
            dataModelBindings: { simpleBinding: 'Innledning-grp-9309.Kontaktinformasjon-grp-9311.MelderFultnavn.orid' },
          },
          lastButton,
        ];
      },
    );
    cy.goto('changename');

    // Make sure the summary page can be hidden
    cy.get(appFrontend.navMenu).find('li > button').should('have.length', 2);
    cy.get(appFrontend.changeOfName.newFirstName).type('hideSummary');
    cy.get(appFrontend.navMenu).find('li > button').should('have.length', 1);

    cy.get(appFrontend.changeOfName.newFirstName).clear();
    cy.get(appFrontend.changeOfName.newLastName).should('be.visible');
    cy.get(appFrontend.navMenu).find('li > button').should('have.length', 2);

    // Typing 1234 into the field should hide the last name component
    cy.get(appFrontend.navMenu).find('li > button').last().click();
    cy.get('#testInputOnSummary').clear().type('1234');
    cy.get(appFrontend.navMenu).find('li > button').first().click();
    cy.get(appFrontend.changeOfName.newLastName).should('not.exist');

    // But hiding the summary page should hide the input there, making the last name component show up again (since
    // the value found in the component lookup is null now)
    cy.get(appFrontend.changeOfName.newFirstName).type('hideSummary');
    cy.get(appFrontend.changeOfName.newLastName).should('be.visible');
    cy.get(appFrontend.navMenu).find('li > button').should('have.length', 1);
  });
});
