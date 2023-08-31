import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Dynamics', () => {
  it('Show and hide confirm name change checkbox on changing firstname', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('test');
    cy.get(appFrontend.changeOfName.newMiddleName).focus();
    cy.get(appFrontend.changeOfName.confirmChangeName).should('be.visible');
    cy.get(appFrontend.changeOfName.newFirstName).clear();
    cy.get(appFrontend.changeOfName.newMiddleName).focus();
    cy.get(appFrontend.changeOfName.confirmChangeName).should('not.exist');
  });

  it('Show and hide name change reasons radio buttons', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('test');
    cy.get(appFrontend.changeOfName.newLastName).type('test');
    cy.get(appFrontend.changeOfName.confirmChangeName).find('input').dsCheck();
    cy.get(appFrontend.changeOfName.reasons).should('be.visible');
  });

  it('Remove validation message when field disappears', () => {
    cy.interceptLayout('changename', (component) => {
      if (component.id === 'newFirstName') {
        component.hidden = ['equals', 'hideFirstName', ['component', 'newLastName']];
      }
    });
    cy.gotoAndComplete('changename');
    cy.navPage('form').click();
    cy.get(appFrontend.changeOfName.newFirstName).clear();
    cy.get(appFrontend.changeOfName.newLastName).clear();
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
    cy.get(appFrontend.navMenuButtons).should('have.length', 3);
    cy.get(appFrontend.changeOfName.newFirstName).type('hideSummary');
    cy.get(appFrontend.navMenuButtons).should('have.length', 2);

    cy.get(appFrontend.changeOfName.newFirstName).clear();
    cy.get(appFrontend.changeOfName.newLastName).should('be.visible');
    cy.get(appFrontend.navMenuButtons).should('have.length', 3);

    // Typing 1234 into the field should hide the last name component
    cy.navPage('summary').click();
    cy.get('#testInputOnSummary').clear();
    cy.get('#testInputOnSummary').type('1234');
    cy.navPage('form').click();
    cy.get(appFrontend.changeOfName.newLastName).should('not.exist');

    // But hiding the summary page should hide the input there, making the last name component show up again (since
    // the value found in the component lookup is null now)
    cy.get(appFrontend.changeOfName.newFirstName).type('hideSummary');
    cy.get(appFrontend.changeOfName.newLastName).should('be.visible');
    cy.get(appFrontend.navMenuButtons).should('have.length', 2);
  });

  it('Interdependent dynamics with component lookups', () => {
    cy.interceptLayout('changename', (component) => {
      // When three fields depend on each other in a chain, we need to run the expressions multiple times in order
      // for the last field to be shown in some cases. This is because the component lookup returns null when the
      // field is hidden, and the expression is not run again when the field is shown again.
      if (component.type === 'Dropdown') {
        // We'll reset these dropdown fields to have basic A, B, C options, removing mapping, so that changing the
        // first field does not reset the second field to have other options.
        component.source = undefined;
        component.optionsId = undefined;
        component.mapping = undefined;
        component.preselectedOptionIndex = undefined;
        component.options = [
          { label: 'Value A', value: 'a' },
          { label: 'Value B', value: 'b' },
          { label: 'Value C', value: 'c' },
        ];
      }
      if (component.id === 'reference') {
        component.hidden = ['notEquals', ['component', 'sources'], 'a'];
      }
      if (component.id === 'reference2') {
        component.hidden = ['notEquals', ['component', 'reference'], 'b'];
      }
    });
    cy.goto('changename');

    // Filling out fields that depend on each other to be visible
    cy.get(appFrontend.changeOfName.sources).should('be.visible');
    cy.get(appFrontend.changeOfName.reference).should('not.exist');
    cy.get(appFrontend.changeOfName.reference2).should('not.exist');

    cy.get(appFrontend.changeOfName.sources).dsSelect('Value A');
    cy.get(appFrontend.changeOfName.reference).should('be.visible');
    cy.get(appFrontend.changeOfName.reference2).should('not.exist');

    cy.get(appFrontend.changeOfName.reference).dsSelect('Value B');
    cy.get(appFrontend.changeOfName.reference2).should('be.visible');

    // Going back and changing something should hide both fields, and changing it back should show both fields
    cy.get(appFrontend.changeOfName.sources).dsSelect('Value B');
    cy.get(appFrontend.changeOfName.reference).should('not.exist');
    cy.get(appFrontend.changeOfName.reference2).should('not.exist');
    cy.get(appFrontend.changeOfName.sources).dsSelect('Value A');
    cy.get(appFrontend.changeOfName.reference).should('be.visible');
    cy.get(appFrontend.changeOfName.reference2).should('be.visible');
  });
});
