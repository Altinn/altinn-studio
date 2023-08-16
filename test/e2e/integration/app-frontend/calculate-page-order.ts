import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import { Triggers } from 'src/types';
import type { ExprUnresolved } from 'src/features/expressions/types';
import type { ILayoutCompInput } from 'src/layout/Input/types';

const appFrontend = new AppFrontend();

describe('Calculate Page Order', () => {
  it('Testing combinations of old and new hidden pages functionalities', () => {
    cy.interceptLayout(
      'group',
      () => {
        // Intentionally empty
      },
      (layoutSet) => {
        // Adding a new required field to the prefill page, just so that we have something to stop us from submitting
        layoutSet.prefill.data.layout.push({
          id: 'yet-another-required-field',
          type: 'Input',
          dataModelBindings: {
            // Same binding as 'sendersName' on the 'hide' page
            simpleBinding: 'Endringsmelding-grp-9786.Avgiver-grp-9787.OppgavegiverNavn-datadef-68.value',
          },
          textResourceBindings: {
            title: 'Yet another required field',
          },
          required: true,
        } as ExprUnresolved<ILayoutCompInput>);

        layoutSet.prefill.data.hidden = [
          'or',
          ['equals', ['component', 'sendersName'], 'hidePrefill'],
          [
            'equals',
            [
              'dataModel',
              'Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[1].nested-grp-1234[0].SkattemeldingEndringEtterFristKommentar-datadef-37133.value',
            ],
            'hidePrefill',
          ],
        ];
        layoutSet.repeating.data.hidden = [
          'and',
          ['equals', ['component', 'sendersName'], 'hideRepeating'],
          [
            'or',
            ['equals', ['component', 'choose-group-prefills'], ''],
            ['equals', ['component', 'choose-group-prefills'], null],
          ],
        ];
      },
    );
    cy.intercept('POST', '**/pages/order*').as('getPageOrder');

    cy.goto('group');
    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();

    cy.get(appFrontend.navMenuButtons).should('have.length', 4);
    cy.gotoNavPage('summary');
    cy.get(appFrontend.sendinButton).click();
    cy.get(appFrontend.errorReport).findAllByRole('listitem').should('have.length', 2);
    cy.get(appFrontend.errorReport).should('contain.text', 'Du må fylle ut oppgave giver navn');
    cy.get(appFrontend.errorReport).should('contain.text', 'Du må fylle ut yet another required field');

    cy.gotoNavPage('repeating');
    cy.addItemToGroup(1, 11, 'automation');
    cy.get(appFrontend.nextButton).click();
    cy.wait('@getPageOrder');

    cy.get(appFrontend.navMenuButtons).should('have.length', 3);
    cy.get(appFrontend.group.sendersName).should('not.exist');
    cy.get(appFrontend.group.summaryText).should('be.visible');
    cy.get(appFrontend.navMenuCurrent).should('have.text', '3. summary');

    // At this point the input field on the 'hide' page is gone, so we shouldn't see it in the error report either
    cy.get(appFrontend.sendinButton).click();
    cy.get(appFrontend.errorReport).findAllByRole('listitem').should('have.length', 1);
    cy.get(appFrontend.errorReport).should('contain.text', 'Du må fylle ut yet another required field');

    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.row(0).editBtn).click();
    cy.get(appFrontend.group.newValue).clear();
    cy.get(appFrontend.group.newValue).type('2');

    cy.get(appFrontend.nextButton).click();
    cy.wait('@getPageOrder');
    cy.get(appFrontend.navMenuButtons).should('have.length', 4);
    cy.get(appFrontend.group.sendersName).should('exist');
    cy.get(appFrontend.navMenuCurrent).should('have.text', '3. hide');

    cy.get(appFrontend.navMenuButtons).should('contain.text', '1. prefill');
    cy.get(appFrontend.group.sendersName).type('hidePrefill');
    cy.get(appFrontend.prevButton).click();
    cy.get(appFrontend.navMenuButtons).should('have.length', 3);
    cy.get(appFrontend.navMenuCurrent).should('have.text', '1. repeating');

    cy.gotoNavPage('hide');
    cy.get(appFrontend.group.sendersName).clear();
    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.saveMainGroup).click();
    cy.addItemToGroup(1, 11, 'hidePrefill');
    cy.get(appFrontend.navMenuButtons).should('have.length', 3);

    // Testing to make sure our required field hidden by an expression does not show up in the error report
    cy.gotoNavPage('summary');
    cy.get(appFrontend.sendinButton).click();
    cy.get(appFrontend.errorReport).findAllByRole('listitem').should('have.length', 1);
    cy.get(appFrontend.errorReport).should('contain.text', 'Du må fylle ut oppgave giver navn');

    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.row(1).deleteBtn).click();

    cy.gotoNavPage('hide');

    // Clicking previous here is expected to not have any effect, because the triggered action is rejected when
    // the 'repeating' page is supposed to be hidden by the change. Clicking too fast leads to a failure...
    cy.get(appFrontend.group.sendersName).type('hideRepeating');
    cy.get(appFrontend.prevButton).click();

    // ...but clicking 'previous' after this point will have updated the components to know that the previous page
    // now is the 'prefill' page
    cy.get(appFrontend.navMenuButtons).should('have.length', 3);
    cy.get(appFrontend.prevButton).click();

    cy.get(appFrontend.navMenuCurrent).should('have.text', '1. prefill');
    cy.get(appFrontend.navMenuButtons).should('contain.text', '2. hide');

    const reproduceBug = JSON.parse('false');
    if (reproduceBug) {
      cy.get(appFrontend.group.prefill.liten).click();
      cy.get(appFrontend.nextButton).click();

      // And this is, in essence, a bug. Navigating to the next page should consider what the next page is, even if
      // just-made-changes affects which page is the next one. Right now the component re-render loop needs to run
      // for NavigationButtons to know what the next layout is in order to navigate to the correct one.
      // TODO: Fix this by triggering a 'navigate to the next page' action instead of 'navigate to this exact page'
      cy.get(appFrontend.navMenuCurrent).should('have.text', '3. hide');
      cy.get(appFrontend.navMenuButtons).should('contain.text', '2. repeating');

      // TODO: Comment this in and delete the lines above when the bug is fixed:
      // cy.get(appFrontend.navMenuCurrent).should('have.text', '2. repeating');
      // cy.get(appFrontend.navMenuButtons).should('contain.text', '3. hide');
    }
  });

  it('Testing pageOrder with hidden next page via dynamics', () => {
    cy.interceptLayout(
      'group',
      (component) => {
        if (component.type === 'NavigationButtons') {
          if (!component.triggers) {
            component.triggers = [Triggers.CalculatePageOrder];
          } else if (!component.triggers?.includes(Triggers.CalculatePageOrder)) {
            component.triggers.push(Triggers.CalculatePageOrder);
          }
        }
      },
      (layoutSet) => {
        layoutSet.hide.data.hidden = ['equals', ['component', 'choose-group-prefills'], 'stor'];
        layoutSet.repeating.data.hidden = ['equals', ['component', 'choose-group-prefills'], 'stor'];
      },
    );
    cy.goto('group');
    cy.get(appFrontend.navMenuButtons).should('have.length', 4);

    // This test relies on Cypress being fast enough to click the 'next' button before the next page is hidden
    cy.get(appFrontend.group.prefill.stor).dsCheck();
    cy.get(appFrontend.nextButton).click();

    // Both pages the 'repeating' and 'hide' pages are now hidden
    cy.get(appFrontend.navMenuButtons).should('have.length', 2);

    // Clicking the next button above did nothing, because the next page was hidden as a result of clicking the
    // checkbox. We'll click again to make sure navigation works again.
    cy.get(appFrontend.navMenuCurrent).should('have.text', '1. prefill');

    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.navMenuCurrent).should('have.text', '2. summary');
  });
});
