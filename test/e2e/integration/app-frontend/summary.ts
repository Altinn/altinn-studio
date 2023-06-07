import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Common } from 'test/e2e/pageobjects/common';

import { Triggers } from 'src/types';
import type { ILayout } from 'src/layout/layout';

const appFrontend = new AppFrontend();
const mui = new Common();

describe('Summary', () => {
  it('Summary of change name form', () => {
    cy.interceptLayout('changename', (component) => {
      if (component.id === 'changeNameFrom') {
        component.hidden = ['equals', ['component', 'newFirstName'], 'hidePrevName'];
      }
    });
    cy.goto('changename');
    cy.gotoNavPage('summary');

    // Verify empty summary components
    cy.get('[data-testid=summary-summary-2]').contains(texts.emptySummary);
    cy.get('[data-testid=summary-summary-4]').contains(texts.emptySummary);
    cy.get('[data-testid=summary-summary-5]').contains(texts.emptySummary);
    cy.get('[data-testid=summary-summary-6]').contains(texts.emptySummary);
    cy.get('[data-testid=summary-summary-reference] [data-testid=summary-item-compact]')
      .and('have.length', 3)
      .then((items) => {
        cy.wrap(items).eq(0).should('contain.text', 'hvor fikk du vite om skjemaet? : Altinn');
        cy.wrap(items).eq(1).should('contain.text', `Referanse : ${texts.emptySummary}`);
        cy.wrap(items).eq(2).should('contain.text', `Referanse 2 : ${texts.emptySummary}`);
      });

    cy.gotoNavPage('form');
    cy.gotoAndComplete('changename');
    cy.gotoNavPage('summary');
    cy.get(appFrontend.backButton).should('be.visible');

    // Summary displays change button for editable fields and does not for readonly fields
    // navigate back to form and clear date
    cy.get(appFrontend.changeOfName.summaryNameChanges).then((summary) => {
      cy.wrap(summary)
        .children()
        .contains(mui.gridContainer, 'Til:')
        .children()
        .then((items) => {
          cy.wrap(items).should('contain.text', 'a a');
          cy.wrap(items).find('button').should('not.exist');
        });

      cy.wrap(summary)
        .siblings()
        .contains(mui.gridContainer, texts.dateOfEffect)
        .then((summaryDate) => {
          cy.wrap(summaryDate).children().find('button').click();
        });

      cy.get(appFrontend.changeOfName.dateOfEffect).clear();
      cy.get(appFrontend.changeOfName.upload).selectFile('test/e2e/fixtures/test.pdf', { force: true });
      cy.get(appFrontend.changeOfName.uploadWithTag.uploadZone).selectFile('test/e2e/fixtures/test.pdf', {
        force: true,
      });
      cy.get(appFrontend.changeOfName.uploadWithTag.tagsDropDown).select('address');
      cy.get(appFrontend.changeOfName.uploadWithTag.saveTag).click();

      cy.get(appFrontend.backToSummaryButton).click();
      cy.navPage('summary').should('have.attr', 'aria-current', 'page');
      cy.get(appFrontend.errorReport).should('contain.text', texts.requiredFieldDateFrom);
    });

    // Summary of attachment components
    cy.get(appFrontend.changeOfName.summaryNameChanges)
      .siblings()
      .then((summary) => {
        cy.wrap(summary)
          .contains(mui.gridContainer, texts.uplodDocs)
          .contains(mui.gridItem, 'test.pdf')
          .should('be.visible');
        cy.wrap(summary)
          .contains(mui.gridContainer, texts.uploadWithTag)
          .contains(mui.gridItem, 'test.pdf')
          .should('contain.text', 'Adresse');
      });

    // Summary displays error when required field is not filled
    // Navigate to form and fill the required field
    cy.get(appFrontend.changeOfName.summaryNameChanges)
      .siblings()
      .contains(mui.gridContainer, texts.dateOfEffect)
      .then((summaryDate) => {
        cy.wrap(summaryDate).contains(texts.dateOfEffect).should('have.css', 'color', 'rgb(213, 32, 59)');
        cy.wrap(summaryDate).contains(mui.gridContainer, texts.requiredFieldDateFrom).should('be.visible');
        cy.wrap(summaryDate).contains('button', texts.goToRightPage).click();
        cy.get(appFrontend.changeOfName.dateOfEffect).siblings().children('button').click();
        cy.get(mui.selectedDate).parent().click();
        cy.get(appFrontend.backToSummaryButton).click();
      });

    // Error in summary field is removed when the required field is filled
    cy.get(appFrontend.changeOfName.summaryNameChanges)
      .siblings()
      .contains(mui.gridContainer, texts.dateOfEffect)
      .then((summaryDate) => {
        cy.wrap(summaryDate).contains(texts.dateOfEffect).should('not.have.css', 'color', 'rgb(213, 32, 59)');
        cy.wrap(summaryDate).contains(mui.gridContainer, texts.requiredFieldDateFrom).should('not.exist');
      });

    // Hide the component the Summary refers to, which should hide the summary component as well
    cy.get('[data-testid=summary-summary-1]').contains('span', 'Du har valgt å endre:').should('be.visible');
    cy.gotoNavPage('form');
    cy.get(appFrontend.changeOfName.newFirstName).clear();
    cy.get(appFrontend.changeOfName.newFirstName).type('hidePrevName');
    cy.gotoNavPage('summary');
    cy.get('[data-testid=summary-summary-1]').should('not.exist');

    // Test summary of non-repeating group
    cy.gotoNavPage('form');
    cy.get('#reference').dsSelect('Ola Nordmann');
    cy.get('#reference2').dsSelect('Ole');
    cy.gotoNavPage('summary');
    cy.get('[data-testid=summary-summary-reference] [data-testid=summary-item-compact]')
      .and('have.length', 3)
      .then((items) => {
        cy.wrap(items).eq(0).should('contain.text', 'hvor fikk du vite om skjemaet? : Altinn');
        cy.wrap(items).eq(1).should('contain.text', 'Referanse : Ola Nordmann');
        cy.wrap(items).eq(2).should('contain.text', 'Referanse 2 : Ole');
      });

    cy.gotoNavPage('form');
    cy.get('#sources').dsSelect('Digitaliseringsdirektoratet');
    cy.get('#reference').dsSelect('Sophie Salt');
    cy.get('#reference2').dsSelect('Dole');
    cy.gotoNavPage('summary');
    cy.get('[data-testid=summary-summary-reference] [data-testid=summary-item-compact]')
      .and('have.length', 3)
      .then((items) => {
        cy.wrap(items).eq(0).should('contain.text', 'hvor fikk du vite om skjemaet? : Digitaliseringsdirektoratet');
        cy.wrap(items).eq(1).should('contain.text', 'Referanse : Sophie Salt');
        cy.wrap(items).eq(2).should('contain.text', 'Referanse 2 : Dole');
      });

    cy.gotoNavPage('form');
    cy.get('#sources').dsSelect('Annet');
    cy.get('#reference').dsSelect('Test');
    cy.get('#reference2').dsSelect('Doffen');
    cy.gotoNavPage('summary');
    cy.get('[data-testid=summary-summary-reference] [data-testid=summary-item-compact]')
      .and('have.length', 3)
      .then((items) => {
        cy.wrap(items).eq(0).should('contain.text', 'hvor fikk du vite om skjemaet? : Annet');
        cy.wrap(items).eq(1).should('contain.text', 'Referanse : Test');
        cy.wrap(items).eq(2).should('contain.text', 'Referanse 2 : Doffen');
      });
  });

  it('is possible to view summary of repeating group', () => {
    cy.goto('group');

    // Verify empty group summary
    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();
    cy.gotoNavPage('summary');
    cy.get('[data-testid=summary-group-component] > div').last().should('contain.text', texts.emptySummary);
    cy.gotoNavPage('prefill');

    cy.gotoAndComplete('group');

    cy.get(appFrontend.group.mainGroupSummary)
      .should('have.length', 1)
      .first()
      .children(mui.gridItem)
      .should('have.length', 8)
      .then((item) => {
        cy.wrap(item).find('button').should('have.length', 7);
        cy.wrap(item).eq(3).should('contain.text', 'attachment-in-single.pdf');
        cy.wrap(item).eq(4).should('contain.text', 'attachment-in-multi1.pdf');
        cy.wrap(item).eq(4).should('contain.text', 'attachment-in-multi2.pdf');
        cy.wrap(item).eq(5).should('contain.text', 'attachment-in-nested.pdf');
        cy.wrap(item).eq(5).should('contain.text', 'automation');
        cy.wrap(item).eq(5).should('contain.text', texts.nestedOptionsToggle);
        cy.wrap(item).eq(5).should('not.contain.text', texts.nestedOptions);
        cy.wrap(item).eq(5).should('contain.text', 'hvor fikk du vite om skjemaet? : Annet');
        cy.wrap(item).eq(5).should('contain.text', 'Referanse : Test');
        cy.wrap(item).eq(6).should('contain.text', 'Digitaliseringsdirektoratet');
        cy.wrap(item).eq(7).should('contain.text', 'Sophie Salt');

        cy.wrap(item).eq(5).find('button').first().should('contain.text', texts.change);
      });

    // Go back to the repeating group in order to set nested options
    cy.get(appFrontend.group.mainGroupSummary).first().children(mui.gridItem).eq(5).find('button').first().click();

    // Check to show a couple of nested options, then go back to the summary
    cy.get(appFrontend.group.row(0).editBtn).click();
    cy.get(appFrontend.group.mainGroup).find(appFrontend.group.editContainer).find(appFrontend.group.next).click();
    cy.get(appFrontend.group.row(0).nestedGroup.row(0).nestedDynamics).dsCheck();

    cy.get(appFrontend.group.row(0).nestedGroup.row(0).nestedOptions[1]).dsCheck();
    cy.get(appFrontend.group.row(0).nestedGroup.row(0).nestedOptions[2]).dsCheck();

    cy.get(appFrontend.group.row(0).nestedGroup.saveBtn).click();
    cy.get(appFrontend.group.saveMainGroup).click();
    cy.get(appFrontend.backToSummaryButton).click();

    cy.get(appFrontend.group.mainGroupSummary)
      .should('have.length', 1)
      .first()
      .children(mui.gridItem)
      .should('have.length', 8)
      .then((item) => {
        cy.wrap(item).eq(5).should('contain.text', texts.nestedOptionsToggle);
        cy.wrap(item).eq(5).should('contain.text', texts.nestedOptions);
        cy.wrap(item).eq(5).should('contain.text', `${texts.nestedOption2}, ${texts.nestedOption3}`);
      });

    cy.gotoNavPage('prefill');
    cy.get(appFrontend.group.prefill.liten).dsCheck();
    cy.get(appFrontend.group.prefill.middels).dsCheck();
    cy.get(appFrontend.group.prefill.svaer).dsCheck();
    cy.gotoNavPage('summary');

    function assertSummaryItem(groupRow: number, items: { [key: string]: boolean }) {
      cy.get(appFrontend.group.mainGroupSummary)
        .eq(groupRow)
        .then((row) => {
          for (const item of Object.keys(items)) {
            const shouldExist = items[item];
            const id = item.replace(/\[idx]/, `${groupRow}`);
            cy.wrap(row)
              .find(`[data-testid="summary-${id}"]`)
              .should(shouldExist ? 'be.visible' : 'not.exist');
          }
        });
    }

    const regularRow = {
      'currentValue-[idx]': true,
      'newValue-[idx]': true,
      'mainUploaderSingle-[idx]': true,
      'mainUploaderMulti-[idx]': true,
      'subGroup-[idx]': true,
    };

    // Rows that come from prefill have their uploaders removed, so these should be hidden
    const prefillRow = {
      ...regularRow,
      'mainUploaderSingle-[idx]': false,
      'mainUploaderMulti-[idx]': false,
    };

    // Rows that come from prefill AND have a 'currentValue' above 100 have their subGroup removed
    const prefillRowAbove100 = {
      ...prefillRow,
      'subGroup-[idx]': false,
    };

    cy.get(appFrontend.group.mainGroupSummary).should('have.length', 4);
    assertSummaryItem(0, regularRow);
    assertSummaryItem(1, prefillRow);
    assertSummaryItem(2, prefillRowAbove100);
    assertSummaryItem(3, prefillRowAbove100);

    // Verify empty values in group summary
    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.next).click();
    cy.get(appFrontend.group.saveSubGroup).click();
    cy.get(appFrontend.group.saveMainGroup).click();
    cy.gotoNavPage('summary');
    cy.get('#summary-mainGroup-4 > [data-testid=summary-currentValue-4] > div')
      .children()
      .last()
      .should('contain.text', texts.emptySummary);
    cy.get('#summary-mainGroup-4 > [data-testid=summary-newValue-4] > div')
      .children()
      .last()
      .should('contain.text', texts.emptySummary);
    cy.get('#summary-mainGroup-4 > [data-testid=summary-mainUploaderSingle-4] > div')
      .children()
      .last()
      .should('contain.text', texts.emptySummary);
    cy.get('#summary-mainGroup-4 > [data-testid=summary-mainUploaderMulti-4] > div')
      .children()
      .last()
      .should('contain.text', texts.emptySummary);
    cy.get('[data-testid=summary-group-component]')
      .children()
      .last()
      .first()
      .should('contain.text', `Kommentarer : ${texts.emptySummary}`)
      .and('contain.text', `Nested uploader with tags : ${texts.emptySummary}`)
      .and('contain.text', `Vis tillegg : ${texts.emptySummary}`)
      .and('contain.text', `Referanse : ${texts.emptySummary}`)
      .and('contain.text', `Skjul kommentar felt : ${texts.emptySummary}`);
    cy.get('#summary-mainGroup-4 > [data-testid=summary-source-4] > div')
      .children()
      .last()
      .should('contain.text', texts.emptySummary);
    cy.get('#summary-mainGroup-4 > [data-testid=summary-reference-4] > div')
      .children()
      .last()
      .should('contain.text', texts.emptySummary);

    // Hiding the group should hide the group summary as well
    cy.get('[data-testid=summary-summary1]').should('be.visible');
    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.showGroupToContinue).find('input[type=checkbox]').dsUncheck();
    cy.gotoNavPage('summary');
    cy.get('[data-testid=summary-summary1]').should('not.exist');
  });

  it('Can exclude children from group summary', () => {
    cy.interceptLayout('group', (component) => {
      if (component.type === 'Summary' && component.id === 'summary1') {
        component.excludedChildren = ['comments-0-1', 'hideComment'];
      }
    });
    cy.goto('group');

    cy.get(appFrontend.group.prefill['liten']).dsCheck();
    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();
    // Add data
    cy.get(appFrontend.group.row(0).editBtn).click();
    cy.get(appFrontend.group.mainGroup).find(appFrontend.group.editContainer).find(appFrontend.group.next).click();

    cy.get(appFrontend.group.comments).type('first comment');
    cy.get(appFrontend.group.saveSubGroup).clickAndGone();
    cy.get(appFrontend.group.addNewItemSubGroup).click();

    cy.get(appFrontend.group.comments).type('second comment');
    cy.get(appFrontend.group.saveSubGroup).clickAndGone();
    cy.get(appFrontend.group.addNewItemSubGroup).click();

    cy.get(appFrontend.group.comments).type('third comment');
    cy.get(appFrontend.group.saveSubGroup).clickAndGone();

    cy.gotoNavPage('summary');
    //Skjul kommentar felt
    cy.get('[data-testid=summary-group-component]')
      .children()
      .last()
      .children()
      .eq(0)
      .should('contain.text', 'Kommentarer : first comment')
      .and('contain.text', `Nested uploader with tags : ${texts.emptySummary}`)
      .and('contain.text', `Vis tillegg : ${texts.emptySummary}`)
      .and('contain.text', `Referanse : ${texts.emptySummary}`)
      .and('not.contain.text', 'Skjul kommentar felt');
    cy.get('[data-testid=summary-group-component]')
      .children()
      .last()
      .children()
      .eq(1)
      .should('not.contain.text', 'Kommentarer')
      .and('contain.text', `Nested uploader with tags : ${texts.emptySummary}`)
      .and('contain.text', `Vis tillegg : ${texts.emptySummary}`)
      .and('contain.text', `Referanse : ${texts.emptySummary}`)
      .and('not.contain.text', 'Skjul kommentar felt');
    cy.get('[data-testid=summary-group-component]')
      .children()
      .last()
      .children()
      .eq(2)
      .should('contain.text', 'Kommentarer : third comment')
      .and('contain.text', `Nested uploader with tags : ${texts.emptySummary}`)
      .and('contain.text', `Vis tillegg : ${texts.emptySummary}`)
      .and('contain.text', `Referanse : ${texts.emptySummary}`)
      .and('not.contain.text', 'Skjul kommentar felt');
  });

  it('Navigation between summary and pages', () => {
    cy.gotoAndComplete('changename');

    const triggerVariations: (Triggers | undefined)[] = [
      undefined,
      Triggers.ValidatePage,
      Triggers.ValidateCurrentAndPreviousPages,
      Triggers.ValidateAllPages,
    ];

    for (const trigger of triggerVariations) {
      injectExtraPageAndSetTriggers(trigger);

      const newFirstNameSummary = '[data-testid=summary-summary-2]';
      const exampleSummary = '[data-testid=summary-summary-reference]';

      cy.navPage('form').click();
      cy.get(appFrontend.changeOfName.newFirstName).clear();
      cy.get(appFrontend.changeOfName.newFirstName).type(`Hello world`);
      cy.get(appFrontend.changeOfName.newLastName).clear();
      cy.get(appFrontend.changeOfName.sources).should('have.value', 'Altinn');
      cy.get(appFrontend.nextButton).clickAndGone();

      if (trigger === undefined) {
        cy.navPage('summary').should('have.attr', 'aria-current', 'page');
      } else {
        cy.navPage('form').should('have.attr', 'aria-current', 'page');
        cy.get(appFrontend.errorReport).should('contain.text', texts.requiredFieldLastName);

        /*
         * Test that ValidateAllPages and ValidatePreviousPages prevents the user from proceeding
         * when there are errors on a previous page.
         */
        cy.gotoNavPage('summary');
        cy.get(appFrontend.nextButton).click();
        if (trigger === Triggers.ValidatePage) {
          cy.navPage('grid').should('have.attr', 'aria-current', 'page');
        } else {
          cy.navPage('summary').should('have.attr', 'aria-current', 'page');
        }

        cy.gotoNavPage('form');
        cy.get(appFrontend.changeOfName.newLastName).type('a');
        cy.get(appFrontend.nextButton).clickAndGone();
      }

      if (trigger === Triggers.ValidateAllPages) {
        cy.get(appFrontend.errorReport).should('contain.text', 'Du må fylle ut page3required');
      }
      cy.navPage('summary').should('have.attr', 'aria-current', 'page');

      cy.get(newFirstNameSummary).should('contain.text', `Hello world`);

      const assertErrorReport = () => {
        if (trigger === Triggers.ValidateAllPages) {
          cy.get(appFrontend.errorReport).should('contain.text', 'Du må fylle ut page3required');
        } else {
          cy.get(appFrontend.errorReport).should('not.exist');
        }
      };

      // Going back to the first page via an 'edit' button and navigating to the summary page again. Also testing
      // that the back to summary button goes away when navigating via the navMenu instead.
      cy.get(exampleSummary).find('button').click();
      cy.get(appFrontend.backToSummaryButton).should('exist');
      cy.navPage('lastPage').click();
      assertErrorReport();
      cy.get(appFrontend.backToSummaryButton).should('not.exist');
      cy.navPage('summary').click();
      assertErrorReport();
      cy.get(exampleSummary).find('button').click();
      assertErrorReport();
      cy.get(appFrontend.backToSummaryButton).click();
      cy.get(appFrontend.backToSummaryButton).should('not.exist');
      assertErrorReport();
      cy.navPage('lastPage').click();
      cy.get(appFrontend.backToSummaryButton).should('not.exist');
      cy.navPage('summary').click();
      assertErrorReport();
      cy.get(appFrontend.backButton).click();
      assertErrorReport();
      cy.navPage('summary').click();
      assertErrorReport();

      // Sending in always validates all pages
      cy.navPage('grid').click();
      cy.get(appFrontend.sendinButton).click();
      cy.get(appFrontend.errorReport).should('contain.text', 'Du må fylle ut page3required');
    }
  });

  it('Navigation to fields on other pages outside the summary should not show the back-to-summary button', () => {
    cy.gotoAndComplete('changename');
    injectExtraPageAndSetTriggers();
    cy.navPage('form').click();
    cy.get(appFrontend.changeOfName.newLastName).clear();
    cy.navPage('lastPage').click();
    cy.get('#page3-submit').click();
    cy.get(appFrontend.errorReport).should('contain.text', 'Du må fylle ut page3required');
    cy.get(appFrontend.errorReport).should('contain.text', texts.requiredFieldLastName);

    // Clicking the error should lead us to the first page
    cy.get(appFrontend.errorReport).find(`li:contains("${texts.requiredFieldLastName}")`).find('button').click();
    cy.navPage('form').should('have.attr', 'aria-current', 'page');

    // The 'back to summary' button should not be here, and when we click 'next' we should land on the next
    // page (not the page we came from)
    cy.get(appFrontend.backToSummaryButton).should('not.exist');
    cy.get(appFrontend.nextButton).click();
    cy.navPage('summary').should('have.attr', 'aria-current', 'page');
  });

  ['Summary Title', undefined].forEach((title) => {
    it(`should display title from summary component if (${title} !== undefined), else title from reference component`, () => {
      cy.interceptLayout('changename', (component) => {
        if (component.type === 'Summary' && component.id === 'summary-4') {
          component.textResourceBindings = {
            title,
            accessibleTitle: title,
          };
        }
      });
      cy.goto('changename');
      cy.gotoNavPage('summary');
      if (title === undefined) {
        cy.get('[data-testid=summary-summary-4]').should('contain.text', 'Når vil du at navnendringen skal skje?');
        cy.get('[data-testid=summary-summary-4]')
          .find('button')
          .should('have.attr', 'aria-label', 'Endre: Når vil du at navnendringen skal skje?');
      } else {
        cy.get('[data-testid=summary-summary-4]').should('contain.text', title);
        cy.get('[data-testid=summary-summary-4]')
          .find('button')
          .should('have.attr', 'aria-label', 'Endre: Summary Title');
      }
    });
  });
});

/**
 * This function provides a tool for doing two things:
 *  1. Inject a new 'page3' that is placed after the summary page. This page has an input component that is marked as
 *     required, so it acts as a control to test validation of all pages. (The 'back to summary' button used to validate
 *     all pages on click, but it really shouldn't do anything differently than the triggers for the 'next' button on
 *     a given page.)
 *  2. Overwrite the triggers on the navigation buttons.
 */
function injectExtraPageAndSetTriggers(trigger?: Triggers | undefined) {
  cy.interceptLayout(
    'changename',
    (component) => {
      if (component.type === 'NavigationButtons') {
        component.triggers = trigger ? [trigger] : [];
      }
    },
    (layoutSet) => {
      const layout: ILayout = [
        {
          id: 'page3-nav',
          type: 'NavigationBar',
        },
        {
          id: 'some-required-component',
          type: 'Input',
          textResourceBindings: {
            title: 'Page3required',
          },
          dataModelBindings: {
            simpleBinding: 'etatid',
          },
          required: true,
        },
        {
          id: 'page3-nav-buttons',
          type: 'NavigationButtons',
          showBackButton: true,
          textResourceBindings: {
            next: texts.next,
            prev: texts.prev,
          },
          triggers: trigger ? [trigger] : [],
        },
        {
          id: 'page3-submit',
          type: 'Button',
          mode: 'submit',
          textResourceBindings: {
            title: 'submit',
          },
        },
      ];
      layoutSet['lastPage'] = { data: { layout } };
    },
  );
  cy.log(`Reloading page with trigger: ${trigger}`);
  cy.get('#readyForPrint').then(() => {
    cy.reload();
  });
  cy.get('#readyForPrint').then(() => {
    cy.reduxDispatch({
      // Injecting the new page into redux
      type: 'formLayout/calculatePageOrderAndMoveToNextPageFulfilled',
      payload: {
        order: ['form', 'summary', 'grid', 'lastPage'],
      },
    });
  });
}
