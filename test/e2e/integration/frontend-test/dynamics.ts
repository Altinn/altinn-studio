import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { changeToLang } from 'test/e2e/support/lang';

import type { CompExternal } from 'src/layout/layout';

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
    cy.findByRole('tab', { name: /nytt etternavn/i }).click();
    cy.get(appFrontend.changeOfName.newLastName).type('test');
    cy.get(appFrontend.changeOfName.confirmChangeName)
      .findByRole('checkbox', {
        name: /Ja[a-z, ]*/,
      })
      .check();
    cy.get(appFrontend.changeOfName.reasons).should('be.visible');
  });

  it('Should save the labels of multiple chosen options and radio buttons', () => {
    cy.gotoHiddenPage('label-data-bindings');

    cy.findByRole('checkbox', { name: 'Blå' }).click();
    cy.findByRole('checkbox', { name: 'Grønn' }).click();
    cy.get('#ColorsLabelsVerify').should('have.value', 'Blå,Grønn');

    cy.findByRole('radio', { name: 'Gulrot' }).click();
    cy.get('#colorLabel').should('have.value', 'Gulrot');

    changeToLang('en');
    cy.get('#ColorsLabelsVerify').should('have.value', 'Blue,Green');
    cy.get('#colorLabel').should('have.value', 'Carrot');
  });

  it('Remove validation message when field disappears', () => {
    cy.interceptLayout('changename', (component) => {
      if (component.id === 'newFirstName') {
        component.hidden = ['equals', 'hideFirstName', ['component', 'newLastName']];
      }
    });
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).clear();
    cy.findByRole('tab', { name: /nytt etternavn/i }).click();
    cy.get(appFrontend.changeOfName.newLastName).clear();
    cy.get(appFrontend.changeOfName.newFirstName).type('test');
    cy.get(appFrontend.errorReport).should('contain.text', texts.testIsNotValidValue);
    cy.get(appFrontend.changeOfName.newLastName).type('hideFirstName');
    cy.get(appFrontend.errorReport).should('not.exist');
    cy.get(appFrontend.changeOfName.newFirstName).should('not.exist');
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
        const lastButton = summaryComponents.pop() as CompExternal;
        layoutSet.summary.data.layout = [
          ...summaryComponents,
          {
            id: 'testInputOnSummary',
            type: 'Input',
            textResourceBindings: { title: 'Temporary field while testing' },
            dataModelBindings: {
              simpleBinding: {
                field: 'Innledning-grp-9309.Kontaktinformasjon-grp-9311.MelderFultnavn.orid',
                dataType: 'ServiceModel-test',
              },
            },
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

    cy.findByRole('tab', { name: /nytt etternavn/i }).click();
    cy.get(appFrontend.changeOfName.newLastName).should('be.visible');
    cy.get(appFrontend.navMenuButtons).should('have.length', 3);

    // Typing 1234 into the field should hide the last name component
    cy.gotoNavPage('summary');
    cy.get('#testInputOnSummary').clear();
    cy.get('#testInputOnSummary').type('1234');
    cy.gotoNavPage('form');
    cy.findByRole('tab', { name: /nytt etternavn/i }).click();
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

    cy.dsSelect(appFrontend.changeOfName.sources, 'Value A');
    cy.get(appFrontend.changeOfName.reference).should('be.visible');
    cy.get(appFrontend.changeOfName.reference2).should('not.exist');

    cy.dsSelect(appFrontend.changeOfName.reference, 'Value B');
    cy.get(appFrontend.changeOfName.reference2).should('be.visible');

    // Going back and changing something should hide both fields, and changing it back should show both fields
    cy.dsSelect(appFrontend.changeOfName.sources, 'Value B');
    cy.get(appFrontend.changeOfName.reference).should('not.exist');
    cy.get(appFrontend.changeOfName.reference2).should('not.exist');
    cy.dsSelect(appFrontend.changeOfName.sources, 'Value A');
    cy.get(appFrontend.changeOfName.reference).should('be.visible');
    cy.get(appFrontend.changeOfName.reference2).should('be.visible');
  });

  it('Deeply linked hidden with component lookups', () => {
    cy.gotoHiddenPage('linked-hidden');

    function fillOut(componentId: string, correctValue = 'Ja', incorrectValue = 'Nei') {
      if (incorrectValue) {
        cy.get('[data-componentid="TrapAlert"]').should('not.exist');
        cy.get('[data-componentid="NoShowAlert"]').should('not.exist');
        cy.get(`[data-componentid="${componentId}"]`).findByRole('radio', { name: incorrectValue }).click();
        componentId === 'LinkedHidden6' && cy.get('[data-componentid="TrapAlert"]').should('be.visible');
        cy.get('[data-componentid="NoShowAlert"]').should('be.visible');
      }
      cy.get(`[data-componentid="${componentId}"]`).findByRole('radio', { name: correctValue }).click();
      cy.get('[data-componentid="NoShowAlert"]').should('not.exist');
      cy.get('[data-componentid="TrapAlert"]').should('not.exist');
    }

    fillOut('LinkedHidden1');
    fillOut('LinkedHidden2');
    fillOut('LinkedHidden3');
    fillOut('LinkedHidden4');
    fillOut('LinkedHidden5');
    fillOut('LinkedHidden6', 'Nei', 'Ja');
    fillOut('LinkedHidden7', 'Neida, jeg gikk ikke på den, jeg lover', '');
    fillOut('LinkedHidden8', 'Ja!');
    fillOut('LinkedHidden9', 'Jeg lover', 'Nei, nå er jeg sur');

    cy.get('[data-componentid="TheTextField"]').find('input').type('Jeg bestod testen, hurra!');
  });
});
