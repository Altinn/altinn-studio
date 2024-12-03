import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Common } from 'test/e2e/pageobjects/common';

import type { PageValidation } from 'src/layout/common.generated';
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
    cy.waitForLoad();

    cy.gotoNavPage('summary');

    // Verify empty summary components
    cy.get('[data-testid=summary-summary2]').contains(texts.emptySummary);
    cy.get('[data-testid=summary-summary4]').contains(texts.emptySummary);
    cy.get('[data-testid=summary-summary5]').contains(texts.emptySummary);
    cy.get('[data-testid=summary-summary6]').contains(texts.emptySummary);
    const referencesSelector = '[data-testid=summary-summary-reference] [data-testid=summary-item-compact]';
    cy.get(referencesSelector).should('have.length', 3);
    cy.get(referencesSelector).eq(0).should('contain.text', 'hvor fikk du vite om skjemaet? : Altinn');
    cy.get(referencesSelector).eq(1).should('contain.text', `Referanse : ${texts.emptySummary}`);
    cy.get(referencesSelector).eq(2).should('contain.text', `Referanse 2 : ${texts.emptySummary}`);

    cy.gotoNavPage('form');
    cy.fillOut('changename');
    cy.gotoNavPage('summary');
    cy.waitUntilSaved();
    cy.findByRole('button', { name: /Tilbake/ }).should('be.visible');

    // Summary displays change button for editable fields and does not for readonly fields
    // navigate back to form and clear date
    cy.get(appFrontend.changeOfName.summaryNameChanges)
      .children()
      .contains(mui.gridContainer, 'Til:')
      .children()
      .then((items) => {
        cy.wrap(items).should('contain.text', 'a a');
        cy.wrap(items).find('button').should('not.exist');
      });

    cy.findByRole('group', { name: 'Endringer til navn' });
    cy.findByRole('button', { name: 'Endre: Når vil du at navnendringen skal skje?' }).click();

    cy.get(appFrontend.changeOfName.dateOfEffect).clear();
    cy.get(appFrontend.changeOfName.upload).selectFile('test/e2e/fixtures/test.pdf', { force: true });
    cy.get(appFrontend.changeOfName.uploadWithTag.uploadZone).selectFile('test/e2e/fixtures/test.pdf', {
      force: true,
    });
    cy.dsSelect(appFrontend.changeOfName.uploadWithTag.tagsDropDown, 'Adresse');
    cy.get(appFrontend.changeOfName.uploadWithTag.saveTag).click();

    cy.findByRole('button', { name: /tilbake til oppsummering/i }).click();
    cy.navPage('summary').should('have.attr', 'aria-current', 'page');

    // This previously tested that the error report was visible here, and that it had 'texts.requiredFieldDateFrom'.
    // However, we haven't clicked any buttons that should trigger that error report to be shown to the user yet.
    cy.get(appFrontend.errorReport).should('not.exist');

    // However, if we go to the grid page and try to submit, the error report will appear and we can
    // continue the test as before
    cy.gotoNavPage('grid');
    cy.get(appFrontend.sendinButton).click();
    cy.get(appFrontend.errorReport).should('contain.text', texts.requiredFieldDateFrom);
    cy.gotoNavPage('summary');

    cy.findByRole('group', { name: 'Endringer til navn' })
      .parent()
      .parent()
      .parent()
      .siblings()
      .then((summary) => {
        cy.wrap(summary)
          .contains(mui.gridContainer, texts.uplodDocs)
          .contains(mui.gridContainer, 'test.pdf')
          .should('be.visible');
        cy.wrap(summary)
          .contains(mui.gridContainer, texts.uploadWithTag)
          .contains(mui.gridContainer, 'test.pdf')
          .should('contain.text', 'Adresse');
      });

    // Summary displays error when required field is not filled
    // Navigate to form and fill the required field
    cy.findByRole('group', { name: 'Endringer til navn' })
      .parent()
      .parent()
      .parent()
      .siblings()
      .contains(mui.gridContainer, texts.dateOfEffect)
      .then((summaryDate) => {
        cy.wrap(summaryDate).contains(texts.dateOfEffect).should('have.css', 'color', 'rgb(213, 32, 59)');
        cy.wrap(summaryDate).contains(mui.gridContainer, texts.requiredFieldDateFrom).should('be.visible');
        cy.wrap(summaryDate).contains('button', texts.goToRightPage).click();
        cy.get(`${appFrontend.changeOfName.dateOfEffect}-button`).click();
        cy.get('button[aria-label*="Today"]').click();
        cy.findByRole('button', { name: /Tilbake til oppsummering/ }).click();
      });

    // Error in summary field is removed when the required field is filled
    cy.findByRole('group', { name: 'Endringer til navn' })
      .parent()
      .parent()
      .parent()
      .siblings()
      .contains(mui.gridContainer, texts.dateOfEffect)
      .then((summaryDate) => {
        cy.wrap(summaryDate).contains(texts.dateOfEffect).should('not.have.css', 'color', 'rgb(213, 32, 59)');
        cy.wrap(summaryDate).contains(mui.gridContainer, texts.requiredFieldDateFrom).should('not.exist');
      });

    // Hide the component the Summary refers to, which should hide the summary component as well
    cy.get('[data-testid=summary-summary1]').contains('span', 'Du har valgt å endre:').should('be.visible');
    cy.gotoNavPage('form');
    cy.get(appFrontend.changeOfName.newFirstName).clear();
    cy.get(appFrontend.changeOfName.newFirstName).type('hidePrevName');
    cy.gotoNavPage('summary');
    cy.get('[data-testid=summary-summary1]').should('not.exist');

    // Test summary of non-repeating group
    cy.gotoNavPage('form');
    cy.dsSelect('#reference', 'Ola Nordmann');
    cy.dsSelect('#reference2', 'Ole');
    cy.gotoNavPage('summary');
    cy.get(referencesSelector).should('have.length', 3);
    cy.get(referencesSelector).eq(0).eq(0).should('contain.text', 'hvor fikk du vite om skjemaet? : Altinn');
    cy.get(referencesSelector).eq(1).should('contain.text', 'Referanse : Ola Nordmann');
    cy.get(referencesSelector).eq(2).should('contain.text', 'Referanse 2 : Ole');

    cy.gotoNavPage('form');
    cy.dsSelect('#sources', 'Digitaliseringsdirektoratet');
    cy.dsSelect('#reference', 'Sophie Salt');
    cy.dsSelect('#reference2', 'Dole');
    cy.gotoNavPage('summary');
    cy.get(referencesSelector).should('have.length', 3);
    cy.get(referencesSelector)
      .eq(0)
      .should('contain.text', 'hvor fikk du vite om skjemaet? : Digitaliseringsdirektoratet');
    cy.get(referencesSelector).eq(1).should('contain.text', 'Referanse : Sophie Salt');
    cy.get(referencesSelector).eq(2).should('contain.text', 'Referanse 2 : Dole');

    cy.gotoNavPage('form');
    cy.dsSelect('#sources', 'Annet');
    cy.dsSelect('#reference', 'Test');
    cy.dsSelect('#reference2', 'Doffen');
    cy.gotoNavPage('summary');
    cy.get(referencesSelector).should('have.length', 3);
    cy.get(referencesSelector).eq(0).should('contain.text', 'hvor fikk du vite om skjemaet? : Annet');
    cy.get(referencesSelector).eq(1).should('contain.text', 'Referanse : Test');
    cy.get(referencesSelector).eq(2).should('contain.text', 'Referanse 2 : Doffen');

    cy.snapshot('summary:change-name');
  });

  it('is possible to view summary of repeating group', () => {
    cy.goto('group');

    // Verify empty group summary
    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.showGroupToContinue).find('input').check();
    cy.gotoNavPage('summary');
    cy.get('[data-testid=summary-group-component] > div').last().should('contain.text', texts.emptySummary);
    cy.gotoNavPage('prefill');

    cy.fillOut('group');

    cy.get(appFrontend.group.mainGroupSummaryContent).should('have.length', 1);
    const groupElements = () => cy.get(appFrontend.group.mainGroupSummaryContent).first().children(mui.gridItem);

    groupElements().should('have.length', 6);
    groupElements().find('button').should('have.length', 8);

    groupElements().eq(2).should('contain.text', 'Digitaliseringsdirektoratet');
    groupElements().eq(2).should('contain.text', 'Sophie Salt');
    groupElements().eq(3).should('contain.text', 'attachment-in-single.pdf');
    groupElements().eq(4).should('contain.text', 'attachment-in-multi1.pdf');
    groupElements().eq(4).should('contain.text', 'attachment-in-multi2.pdf');
    groupElements().eq(5).should('contain.text', 'attachment-in-nested.pdf');
    groupElements().eq(5).should('contain.text', 'automation');
    groupElements().eq(5).should('contain.text', texts.nestedOptionsToggle);
    groupElements().eq(5).should('not.contain.text', texts.nestedOptions);
    groupElements().eq(5).should('contain.text', 'hvor fikk du vite om skjemaet? : Annet');
    groupElements().eq(5).should('contain.text', 'Referanse : Test');
    groupElements().eq(5).find('button').first().should('contain.text', texts.change);

    // Go back to the repeating group in order to set nested options
    groupElements().eq(5).find('button').first().click();

    // Check to show a couple of nested options, then go back to the summary
    cy.get(appFrontend.group.row(0).nestedGroup.row(0).editBtn).click();
    cy.get(appFrontend.group.row(0).nestedGroup.row(0).nestedDynamics).check();
    cy.get(appFrontend.group.row(0).nestedGroup.row(0).nestedOptions[1]).check();
    cy.get(appFrontend.group.row(0).nestedGroup.row(0).nestedOptions[2]).check();
    cy.findByRole('button', { name: /Tilbake til oppsummering/ }).click();

    cy.get(appFrontend.group.mainGroupSummaryContent).should('have.length', 1);
    groupElements().should('have.length', 6);
    groupElements().eq(5).should('contain.text', texts.nestedOptionsToggle);
    groupElements().eq(5).should('contain.text', texts.nestedOptions);
    groupElements().eq(5).should('contain.text', `${texts.nestedOption2}, ${texts.nestedOption3}`);

    cy.gotoNavPage('prefill');
    cy.get(appFrontend.group.prefill.liten).check();
    cy.get(appFrontend.group.prefill.middels).check();
    cy.get(appFrontend.group.prefill.svaer).check();
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
    cy.waitForLoad();
    cy.get(appFrontend.group.row(4).nestedGroup.row(0).nestedSource).should('have.value', 'Altinn');

    cy.get(appFrontend.group.saveSubGroup).click();
    cy.get(appFrontend.group.saveMainGroup).click();

    cy.get(appFrontend.group.addNewItem).click();
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
      .eq(5)
      .first()
      .should('contain.text', `Kommentarer : ${texts.emptySummary}`)
      .and('contain.text', `Nested uploader with tags : ${texts.emptySummary}`)
      .and('contain.text', `Vis tillegg : ${texts.emptySummary}`)
      .and('contain.text', `Referanse : ${texts.emptySummary}`)
      .and('contain.text', `Skjul kommentar felt : ${texts.emptySummary}`);
    cy.get('[data-testid=summary-group-component]')
      .children()
      .eq(5)
      .first()
      .should('contain.text', `hvor fikk du vite om skjemaet? : Altinn`);
    cy.get('#summary-mainGroup-5 [data-testid=summary-source-5] > div')
      .children()
      .last()
      .should('contain.text', 'Altinn');
    cy.get('#summary-mainGroup-5 [data-testid=summary-reference-5] > div')
      .children()
      .last()
      .should('contain.text', texts.emptySummary);

    cy.snapshot('summary:repeating-groups');

    // Hiding the group should hide the group summary as well
    cy.get('[data-testid=summary-summary1]').should('be.visible');
    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.showGroupToContinue).find('input[type=checkbox]').uncheck();
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

    cy.get(appFrontend.group.prefill['liten']).check();
    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.showGroupToContinue).find('input').check();
    // Add data
    cy.findByRole('button', { name: 'Se innhold NOK 1' }).click();
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

    const pageValidationConfigs: (PageValidation | undefined)[] = [
      undefined,
      { page: 'current', show: ['All'] },
      { page: 'currentAndPrevious', show: ['All'] },
      { page: 'all', show: ['All'] },
    ];

    for (const config of pageValidationConfigs) {
      injectExtraPageAndSetTriggers(config);

      const newFirstNameSummary = '[data-testid=summary-summary2]';
      const exampleSummary = '[data-testid=summary-summary-reference]';

      cy.gotoNavPage('form');
      cy.get(appFrontend.changeOfName.newFirstName).clear();
      cy.get(appFrontend.changeOfName.newFirstName).type(`Anne`);
      cy.findByRole('tab', { name: /nytt etternavn/i }).click();
      cy.get(appFrontend.changeOfName.newLastName).clear();
      cy.get(appFrontend.changeOfName.sources).should('have.value', 'Altinn');
      cy.findByRole('button', { name: /Neste/ }).click();

      if (config === undefined) {
        cy.navPage('summary').should('have.attr', 'aria-current', 'page');
      } else {
        cy.navPage('form').should('have.attr', 'aria-current', 'page');
        cy.get(appFrontend.errorReport).should('contain.text', texts.requiredFieldLastName);

        /*
         * Test that ValidateAllPages and ValidatePreviousPages prevents the user from proceeding
         * when there are errors on a previous page.
         */
        cy.gotoNavPage('summary');
        cy.findByRole('button', { name: /Neste/ }).click();
        if (config.page === 'current') {
          cy.navPage('grid').should('have.attr', 'aria-current', 'page');
        } else {
          cy.navPage('summary').should('have.attr', 'aria-current', 'page');
        }

        cy.gotoNavPage('form');
        cy.findByRole('tab', { name: /nytt etternavn/i }).click();
        cy.get(appFrontend.changeOfName.newLastName).type('a');
        cy.get(appFrontend.changeOfName.newLastName).blur();
        cy.findByRole('button', { name: /Neste/ }).click();
      }

      if (config?.page === 'all') {
        cy.get(appFrontend.errorReport).should('contain.text', 'Du må fylle ut page3required');
      }
      cy.navPage('summary').should('have.attr', 'aria-current', 'page');

      cy.get(newFirstNameSummary).should('contain.text', `Anne`);

      const assertErrorReport = () => {
        if (config?.page === 'all') {
          cy.get(appFrontend.errorReport).should('contain.text', 'Du må fylle ut page3required');
        } else {
          cy.get(appFrontend.errorReport).should('not.exist');
        }
      };

      // Going back to the first page via an 'edit' button and navigating to the summary page again. Also testing
      // that the back to summary button goes away when navigating via the navMenu instead.
      cy.get(`${exampleSummary} button`).click();
      cy.get(appFrontend.changeOfName.newFirstName).should('exist'); // We're now on the first page
      cy.findByRole('button', { name: /Tilbake til oppsummering/ }).should('exist');
      cy.gotoNavPage('lastPage');
      cy.get('#some-required-component').should('exist');
      assertErrorReport();
      cy.findByRole('button', { name: /Tilbake til oppsummering/ }).should('not.exist');
      cy.gotoNavPage('summary');
      cy.get(exampleSummary).should('exist');
      assertErrorReport();
      cy.get(`${exampleSummary} button`).click();
      cy.get(appFrontend.changeOfName.newFirstName).should('exist');
      assertErrorReport();
      cy.findByRole('button', { name: /Tilbake til oppsummering/ }).click();
      cy.findByRole('button', { name: /Tilbake til oppsummering/ }).should('not.exist');
      cy.get(exampleSummary).should('exist');
      assertErrorReport();
      cy.gotoNavPage('lastPage');
      cy.get('#some-required-component').should('exist');
      cy.findByRole('button', { name: /Tilbake til oppsummering/ }).should('not.exist');
      cy.gotoNavPage('summary');
      cy.get(exampleSummary).should('exist');
      assertErrorReport();
      cy.findByRole('button', { name: /Tilbake/ }).click();
      assertErrorReport();
      cy.gotoNavPage('summary');
      cy.get(exampleSummary).should('exist');
      assertErrorReport();

      // Sending in always validates all pages
      cy.gotoNavPage('grid');
      cy.get(appFrontend.sendinButton).click();
      cy.get(appFrontend.errorReport).should('contain.text', 'Du må fylle ut page3required');
    }
  });

  it('Navigation to fields on other pages outside the summary should not show the back-to-summary button', () => {
    cy.gotoAndComplete('changename');
    injectExtraPageAndSetTriggers();
    cy.gotoNavPage('form');
    cy.findByRole('tab', { name: /nytt etternavn/i }).click();
    cy.get(appFrontend.changeOfName.newLastName).clear();
    cy.gotoNavPage('lastPage');
    cy.get('#page3-submit').click();
    cy.get(appFrontend.errorReport).should('contain.text', 'Du må fylle ut page3required');
    cy.get(appFrontend.errorReport).should('contain.text', texts.requiredFieldLastName);

    // Clicking the error should lead us to the first page
    cy.get(appFrontend.errorReport).find(`li:contains("${texts.requiredFieldLastName}")`).find('button').click();
    cy.navPage('form').should('have.attr', 'aria-current', 'page');

    // The 'back to summary' button should not be here, and when we click 'next' we should land on the next
    // page (not the page we came from)
    cy.findByRole('button', { name: /Tilbake til oppsummering/ }).should('not.exist');
    cy.findByRole('button', { name: /Neste/ }).click();
    cy.navPage('summary').should('have.attr', 'aria-current', 'page');
  });

  it('should display summaryTitle and/or summaryAccessibleTitle in summary if defined', () => {
    //The test below validates that the summary component displays the appropriate summaryTitle and summaryAccessibleTitle values,
    //based on the provided test data, for different types of components in the "changename" layout.
    const testTitleData = [
      {
        summaryTitle: 'Summary Title',
        summaryAccessibleTitle: 'Summary Accessible Title',
      },
      {
        summaryAccessibleTitle: 'Summary Accessible Title',
      },
      {
        summaryTitle: 'Summary Title',
      },
      undefined,
    ];

    const components = [
      {
        id: 'dateOfEffect',
        type: 'Datepicker' as const,
        summaryComponent: '[data-testid=summary-summary4]',
        defaultTitle: 'Dette vises når det ikke er satt summaryTitle',
      },
      {
        id: 'reference-group',
        type: 'Group' as const,
        summaryComponent: '[data-testid=summary-group-component]',
        defaultTitle: 'Dette vises når det ikke er satt summaryTitle',
      },
    ];

    cy.goto('changename');
    cy.gotoNavPage('summary');

    for (const title of testTitleData) {
      cy.changeLayout((component) => {
        for (const c of components) {
          if (c.id === component.id && c.type === component.type) {
            component.textResourceBindings = {
              title: c.defaultTitle,
              summaryTitle: title?.summaryTitle,
              summaryAccessibleTitle: title?.summaryAccessibleTitle,
            };
          }
        }
      });

      components.forEach(({ summaryComponent, defaultTitle }) => {
        cy.get(summaryComponent).should('contain.text', title?.summaryTitle ?? defaultTitle);
        cy.get(summaryComponent)
          .find('button')
          .should(
            'have.attr',
            'aria-label',
            `Endre: ${title?.summaryAccessibleTitle ?? title?.summaryTitle ?? defaultTitle}`,
          );
      });
    }
  });

  it('backToSummary should disappear when navigating away from the current page', () => {
    cy.goto('changename');

    cy.findByRole('tab', { name: /nytt etternavn/i }).click();
    cy.get(appFrontend.changeOfName.newLastName).type('Hansen');
    cy.get(appFrontend.changeOfName.confirmChangeName).find('label').click();
    cy.findByRole('button', { name: /Neste/ }).should('be.visible');
    cy.findByRole('button', { name: /Tilbake til oppsummering/ }).should('not.exist');
    // Get some validation messages
    cy.gotoNavPage('grid');
    cy.get(appFrontend.sendinButton).click();

    /**
     * test() should return true if backToSummary should be gone, and false if it should still be visible
     */
    function testNavigationMethod(test: () => boolean) {
      cy.gotoNavPage('summary');
      cy.get('[data-componentid="summary3"] button').click();
      cy.navPage('form').should('have.attr', 'aria-current', 'page');
      cy.findByRole('button', { name: /Tilbake til oppsummering/ }).should('be.visible');
      cy.findByRole('button', { name: /Neste/ }).should('not.exist');

      if (test()) {
        cy.findByRole('button', { name: /Neste/ }).should('be.visible');
        cy.findByRole('button', { name: /Tilbake til oppsummering/ }).should('not.exist');
      } else {
        cy.findByRole('button', { name: /Tilbake til oppsummering/ }).should('be.visible');
        cy.findByRole('button', { name: /Neste/ }).should('not.exist');
      }
    }

    // Navigation bare should clear backToSummary
    testNavigationMethod(() => {
      cy.gotoNavPage('summary');
      return true;
    });

    // Error report on the same page should not clear backToSummary
    testNavigationMethod(() => {
      cy.get(appFrontend.errorReport).find(`li:contains("${texts.requiredFieldFromBackend}")`).find('button').click();
      cy.get(appFrontend.changeOfName.newFirstName).should('be.focused');
      return false;
    });

    // Clicking backToSummary should clear it
    testNavigationMethod(() => {
      cy.findByRole('button', { name: /Tilbake til oppsummering/ }).click();
      cy.navPage('summary').should('have.attr', 'aria-current', 'page');
      return true;
    });

    // Error report to different page shoud clear backToSummary
    cy.gotoNavPage('summary');
    cy.get('[data-testid="summary-fordeling-bolig"] button').click();
    cy.navPage('grid').should('have.attr', 'aria-current', 'page');
    cy.get(appFrontend.errorReport).find(`li:contains("${texts.requiredFieldFromBackend}")`).find('button').click();
    cy.navPage('form').should('have.attr', 'aria-current', 'page');
    cy.get(appFrontend.changeOfName.newFirstName).should('be.focused');
    cy.findByRole('button', { name: /Neste/ }).should('be.visible');
    cy.findByRole('button', { name: /Tilbake til oppsummering/ }).should('not.exist');
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
function injectExtraPageAndSetTriggers(pageValidationConfig?: PageValidation | undefined) {
  cy.interceptLayout(
    'changename',
    (component) => {
      if (component.type === 'NavigationButtons') {
        component.validateOnNext = pageValidationConfig;
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
            simpleBinding: {
              field: 'etatid',
              dataType: 'ServiceModel-test',
            },
          },
          required: true,
        },
        {
          id: 'page3-nav-buttons',
          type: 'NavigationButtons',
          showBackButton: true,
          textResourceBindings: {
            next: texts.next,
            back: texts.prev,
          },
          validateOnNext: pageValidationConfig,
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
  cy.log(`Reloading page with trigger: ${pageValidationConfig?.page ?? 'undefined'}`);
  cy.get('#finishedLoading').then(() => {
    cy.reload();
  });
  cy.intercept('GET', '**/api/layoutsettings/changename', {
    statusCode: 200,
    body: {
      $schema: 'https://altinncdn.no/schemas/json/layout/layoutSettings.schema.v1.json',
      pages: {
        order: ['form', 'summary', 'grid', 'lastPage'],
        excludeFromPdf: ['summary'],
        showLanguageSelector: true,
      },
      components: {
        excludeFromPdf: [],
      },
    },
  });
}
