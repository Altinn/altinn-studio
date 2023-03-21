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
    cy.get(appFrontend.navMenu).find('li > button').last().click();

    // Verify empty summary components
    cy.get('[data-testid=summary-summary-2] > div > [data-testid=summary-item-simple]').should(
      'contain.text',
      'Du har ikke lagt inn informasjon her',
    );
    cy.get('[data-testid=summary-summary-4] > div > [data-testid=summary-item-simple]').should(
      'contain.text',
      'Du har ikke lagt inn informasjon her',
    );
    cy.get('[data-testid=summary-summary-5] > div > [data-testid=attachment-summary-component]').should(
      'contain.text',
      'Du har ikke lagt inn informasjon her',
    );
    cy.get('[data-testid=summary-summary-6] > div > [data-testid=attachment-with-tag-summary]').should(
      'contain.text',
      'Du har ikke lagt inn informasjon her',
    );
    cy.get('[data-testid=summary-summary-reference] [data-testid=summary-item-compact]')
      .and('have.length', 3)
      .then((items) => {
        cy.wrap(items).eq(0).should('contain.text', 'hvor fikk du vite om skjemaet? : Altinn');
        cy.wrap(items).eq(1).should('contain.text', 'Referanse : Du har ikke lagt inn informasjon her');
        cy.wrap(items).eq(2).should('contain.text', 'Referanse 2 : Du har ikke lagt inn informasjon her');
      });

    cy.get(appFrontend.navMenu).find('li > button').first().click();
    cy.gotoAndComplete('changename');
    cy.get(appFrontend.backButton).should('be.visible');

    // Summary displays change button for editable fields and does not for readonly fields
    // navigate back to form and clear date
    cy.get(appFrontend.changeOfName.summaryNameChanges)
      .should('be.visible')
      .then((summary) => {
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
            cy.wrap(summaryDate).children().find('button').should('exist').and('be.visible').click();
            cy.get(appFrontend.changeOfName.dateOfEffect).clear();
            cy.get(appFrontend.changeOfName.upload).selectFile('test/e2e/fixtures/test.pdf', { force: true });
            cy.get(appFrontend.changeOfName.uploadWithTag.uploadZone).selectFile('test/e2e/fixtures/test.pdf', {
              force: true,
            });
            cy.get(appFrontend.changeOfName.uploadWithTag.tagsDropDown).should('be.visible').select('address');
            cy.get(appFrontend.changeOfName.uploadWithTag.saveTag).should('be.visible').click();
            cy.get(appFrontend.backToSummaryButton).should('be.visible').click();
          });
      });

    // Summary of attachment components
    cy.get(appFrontend.changeOfName.summaryNameChanges)
      .should('exist')
      .siblings()
      .then((summary) => {
        cy.wrap(summary)
          .contains(mui.gridContainer, texts.uplodDocs)
          .contains(mui.gridItem, 'test.pdf')
          .should('be.visible');
        cy.wrap(summary)
          .contains(mui.gridContainer, texts.uploadWithTag)
          .contains(mui.gridItem, 'test.pdf')
          .should('be.visible')
          .and('contain.text', 'Adresse');
      });

    // Summary displays error when required field is not filled
    // Navigate to form and fill the required field
    cy.get(appFrontend.changeOfName.summaryNameChanges)
      .should('exist')
      .siblings()
      .contains(mui.gridContainer, texts.dateOfEffect)
      .then((summaryDate) => {
        cy.wrap(summaryDate).contains(texts.dateOfEffect).should('have.css', 'color', 'rgb(213, 32, 59)');
        cy.wrap(summaryDate).contains(mui.gridContainer, texts.requiredFieldDateFrom).should('be.visible');
        cy.wrap(summaryDate).contains('button', texts.goToRightPage).should('be.visible').click();
        cy.get(appFrontend.changeOfName.dateOfEffect)
          .siblings()
          .children('button')
          .click()
          .then(() => {
            cy.get(mui.selectedDate).parent().click();
            cy.get(appFrontend.backToSummaryButton).should('be.visible').click();
          });
      });

    // Error in summary field is removed when the required field is filled
    cy.get(appFrontend.changeOfName.summaryNameChanges)
      .should('exist')
      .siblings()
      .contains(mui.gridContainer, texts.dateOfEffect)
      .then((summaryDate) => {
        cy.wrap(summaryDate).contains(texts.dateOfEffect).should('not.have.css', 'color', 'rgb(213, 32, 59)');
        cy.wrap(summaryDate).contains(mui.gridContainer, texts.requiredFieldDateFrom).should('not.exist');
      });

    // Hide the component the Summary refers to, which should hide the summary component as well
    cy.get('[data-testid=summary-summary-1]').contains('span', 'Du har valgt å endre:').should('be.visible');
    cy.get(appFrontend.navMenu).find('li > button').first().click();
    cy.get(appFrontend.changeOfName.newFirstName).clear().type('hidePrevName');
    cy.get(appFrontend.navMenu).find('li > button').last().click();
    cy.get('[data-testid=summary-summary-1]').should('not.exist');

    // Test summary of non-repeating group
    cy.get(appFrontend.navMenu).find('li > button').first().click();
    cy.get('#reference').should('exist').and('be.visible').select('Ola Nordmann');
    cy.get('#reference2').should('exist').and('be.visible').select('Ole');
    cy.get(appFrontend.navMenu).find('li > button').last().click();
    cy.get('[data-testid=summary-summary-reference] [data-testid=summary-item-compact]')
      .and('have.length', 3)
      .then((items) => {
        cy.wrap(items).eq(0).should('contain.text', 'hvor fikk du vite om skjemaet? : Altinn');
        cy.wrap(items).eq(1).should('contain.text', 'Referanse : Ola Nordmann');
        cy.wrap(items).eq(2).should('contain.text', 'Referanse 2 : Ole');
      });

    cy.get(appFrontend.navMenu).find('li > button').first().click();
    cy.intercept('GET', '**/options/*').as('getOptions');
    cy.get('#sources').should('exist').and('be.visible').select('Digitaliseringsdirektoratet');
    cy.wait(['@getOptions', '@getOptions']);
    cy.get('#reference').should('exist').and('be.visible').select('Sophie Salt');
    cy.get('#reference2').should('exist').and('be.visible').select('Dole');
    cy.get(appFrontend.navMenu).find('li > button').last().click();
    cy.get('[data-testid=summary-summary-reference] [data-testid=summary-item-compact]')
      .and('have.length', 3)
      .then((items) => {
        cy.wrap(items).eq(0).should('contain.text', 'hvor fikk du vite om skjemaet? : Digitaliseringsdirektoratet');
        cy.wrap(items).eq(1).should('contain.text', 'Referanse : Sophie Salt');
        cy.wrap(items).eq(2).should('contain.text', 'Referanse 2 : Dole');
      });

    cy.get(appFrontend.navMenu).find('li > button').first().click();
    cy.get('#sources').should('exist').and('be.visible').select('Annet');
    cy.wait(['@getOptions', '@getOptions']);
    cy.get('#reference').should('exist').and('be.visible').select('Test');
    cy.get('#reference2').should('exist').and('be.visible').select('Doffen');
    cy.get(appFrontend.navMenu).find('li > button').last().click();
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
    cy.get(appFrontend.navMenu).find('li > button').eq(1).click();
    cy.get(appFrontend.group.showGroupToContinue).find('input').check({ force: true });
    cy.get(appFrontend.navMenu).find('li > button').last().click();
    cy.get('[data-testid=summary-group-component] > div')
      .last()
      .should('exist')
      .and('be.visible')
      .and('contain.text', 'Du har ikke lagt inn informasjon her');
    cy.get(appFrontend.navMenu).find('li > button').first().click();

    cy.gotoAndComplete('group');

    cy.get(appFrontend.group.mainGroupSummary)
      .should('be.visible')
      .and('have.length', 1)
      .first()
      .children(mui.gridItem)
      .should('have.length', 8)
      .then((item) => {
        cy.wrap(item).find('button').should('have.length', 7);
        cy.wrap(item)
          .eq(1)
          .children(mui.gridContainer)
          .should('have.css', 'border-bottom', '1px dashed rgb(0, 143, 214)');
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
    cy.get(appFrontend.group.row(0).nestedGroup.row(0).nestedDynamics).click({ force: true });

    const workAroundSlowSave = JSON.parse('true');
    if (workAroundSlowSave) {
      cy.intercept('PUT', '**/instances/*/*/data/*').as('updateInstance');
      // Blurring each of these works around a problem where clicking these too fast will overwrite the immedateState
      // value in useDelayedSaveState(). This is a fundamental problem with the useDelayedSaveState() functionality,
      // and in the future we should fix this properly by simplifying to save data immediately in the redux state
      // but delay the PUT request instead.
      // See https://github.com/Altinn/app-frontend-react/issues/339#issuecomment-1321920974
      cy.get(appFrontend.group.row(0).nestedGroup.row(0).nestedOptions[1]).check({ force: true }).blur();
      cy.wait('@updateInstance');
      cy.get(appFrontend.group.row(0).nestedGroup.row(0).nestedOptions[2]).check({ force: true }).blur();
      cy.wait('@updateInstance');
    } else {
      cy.get(appFrontend.group.row(0).nestedGroup.row(0).nestedOptions[1]).check({ force: true });
      cy.get(appFrontend.group.row(0).nestedGroup.row(0).nestedOptions[2]).check({ force: true });
    }

    cy.get(appFrontend.group.row(0).nestedGroup.saveBtn).click();
    cy.get(appFrontend.group.saveMainGroup).click();
    cy.get(appFrontend.backToSummaryButton).click();

    cy.get(appFrontend.group.mainGroupSummary)
      .should('be.visible')
      .and('have.length', 1)
      .first()
      .children(mui.gridItem)
      .should('have.length', 8)
      .then((item) => {
        cy.wrap(item).eq(5).should('contain.text', texts.nestedOptionsToggle);
        cy.wrap(item).eq(5).should('contain.text', texts.nestedOptions);
        cy.wrap(item).eq(5).should('contain.text', `${texts.nestedOption2}, ${texts.nestedOption3}`);
      });

    cy.get(appFrontend.navMenu).find('li > button').first().click();
    cy.get(appFrontend.group.prefill.liten).click({ force: true }).blur();
    cy.get(appFrontend.group.prefill.middels).click({ force: true }).blur();
    cy.get(appFrontend.group.prefill.svaer).click({ force: true }).blur();
    cy.get(appFrontend.navMenu).find('li > button').last().click();

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
    cy.get(appFrontend.navMenu).find('li > button').eq(1).click();
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.next).click();
    cy.get(appFrontend.group.saveSubGroup).click();
    cy.get(appFrontend.group.saveMainGroup).click();
    cy.get(appFrontend.navMenu).find('li > button').last().click();
    cy.get('#summary-mainGroup-4 > [data-testid=summary-currentValue-4] > div')
      .children()
      .last()
      .should('exist')
      .and('be.visible')
      .and('contain.text', 'Du har ikke lagt inn informasjon her');
    cy.get('#summary-mainGroup-4 > [data-testid=summary-newValue-4] > div')
      .children()
      .last()
      .should('exist')
      .and('be.visible')
      .and('contain.text', 'Du har ikke lagt inn informasjon her');
    cy.get('#summary-mainGroup-4 > [data-testid=summary-mainUploaderSingle-4] > div')
      .children()
      .last()
      .should('exist')
      .and('be.visible')
      .and('contain.text', 'Du har ikke lagt inn informasjon her');
    cy.get('#summary-mainGroup-4 > [data-testid=summary-mainUploaderMulti-4] > div')
      .children()
      .last()
      .should('exist')
      .and('be.visible')
      .and('contain.text', 'Du har ikke lagt inn informasjon her');
    cy.get('#summary-mainGroup-4 > [data-testid=summary-subGroup-4] > div > [data-testid=summary-group-component]')
      .children()
      .last()
      .first()
      .should('exist')
      .and('be.visible')
      .and('contain.text', 'Kommentarer : Du har ikke lagt inn informasjon her')
      .and('contain.text', 'Nested uploader with tags : Du har ikke lagt inn informasjon her')
      .and('contain.text', 'Vis tillegg : Du har ikke lagt inn informasjon her')
      .and('contain.text', 'Referanse : Du har ikke lagt inn informasjon her')
      .and('contain.text', 'Skjul kommentar felt : Du har ikke lagt inn informasjon her');
    cy.get('#summary-mainGroup-4 > [data-testid=summary-source-4] > div')
      .children()
      .last()
      .should('exist')
      .and('be.visible')
      .and('contain.text', 'Du har ikke lagt inn informasjon her');
    cy.get('#summary-mainGroup-4 > [data-testid=summary-reference-4] > div')
      .children()
      .last()
      .should('exist')
      .and('be.visible')
      .and('contain.text', 'Du har ikke lagt inn informasjon her');

    // Hiding the group should hide the group summary as well
    cy.get('[data-testid=summary-summary-1]').should('be.visible');
    cy.get(appFrontend.navMenu).find('li > button').eq(1).click();
    cy.get(appFrontend.group.showGroupToContinue).find('input[type=checkbox]').uncheck({ force: true });
    cy.get(appFrontend.navMenu).find('li > button').last().click();
    cy.get('[data-testid=summary-summary-1]').should('not.exist');
  });

  it('Can exclude children from group summary', () => {
    cy.interceptLayout('group', (component) => {
      if (component.type === 'Summary' && component.id === 'summary-1') {
        component.excludedChildren = ['comments-0-1', 'hideComment'];
      }
    });
    cy.goto('group');

    cy.get(appFrontend.group.prefill['liten']).click({ force: true }).blur();
    cy.get(appFrontend.navMenu).find('li > button').eq(1).click();
    cy.get(appFrontend.group.showGroupToContinue).find('input').check({ force: true });
    // Add data
    cy.get(appFrontend.group.row(0).editBtn).click();
    cy.get(appFrontend.group.mainGroup).find(appFrontend.group.editContainer).find(appFrontend.group.next).click();

    cy.get(appFrontend.group.comments).type('first comment').blur();
    cy.get(appFrontend.group.saveSubGroup).should('be.visible').click().should('not.exist');
    cy.get(appFrontend.group.addNewItemSubGroup).should('exist').and('be.visible').focus().click();

    cy.get(appFrontend.group.comments).type('second comment').blur();
    cy.get(appFrontend.group.saveSubGroup).should('be.visible').click().should('not.exist');
    cy.get(appFrontend.group.addNewItemSubGroup).should('exist').and('be.visible').focus().click();

    cy.get(appFrontend.group.comments).type('third comment').blur();
    cy.get(appFrontend.group.saveSubGroup).should('be.visible').click().should('not.exist');

    cy.get(appFrontend.navMenu).find('li > button').last().click();
    //Skjul kommentar felt
    cy.get('#summary-mainGroup-0 > [data-testid=summary-subGroup-0] > div > [data-testid=summary-group-component]')
      .children()
      .last()
      .children()
      .eq(0)
      .should('exist')
      .and('be.visible')
      .and('contain.text', 'Kommentarer : first comment')
      .and('contain.text', 'Nested uploader with tags : Du har ikke lagt inn informasjon her')
      .and('contain.text', 'Vis tillegg : Du har ikke lagt inn informasjon her')
      .and('contain.text', 'Referanse : Du har ikke lagt inn informasjon her')
      .and('not.contain.text', 'Skjul kommentar felt');
    cy.get('#summary-mainGroup-0 > [data-testid=summary-subGroup-0] > div > [data-testid=summary-group-component]')
      .children()
      .last()
      .children()
      .eq(1)
      .should('exist')
      .and('be.visible')
      .and('not.contain.text', 'Kommentarer')
      .and('contain.text', 'Nested uploader with tags : Du har ikke lagt inn informasjon her')
      .and('contain.text', 'Vis tillegg : Du har ikke lagt inn informasjon her')
      .and('contain.text', 'Referanse : Du har ikke lagt inn informasjon her')
      .and('not.contain.text', 'Skjul kommentar felt');
    cy.get('#summary-mainGroup-0 > [data-testid=summary-subGroup-0] > div > [data-testid=summary-group-component]')
      .children()
      .last()
      .children()
      .eq(2)
      .should('exist')
      .and('be.visible')
      .and('contain.text', 'Kommentarer : third comment')
      .and('contain.text', 'Nested uploader with tags : Du har ikke lagt inn informasjon her')
      .and('contain.text', 'Vis tillegg : Du har ikke lagt inn informasjon her')
      .and('contain.text', 'Referanse : Du har ikke lagt inn informasjon her')
      .and('not.contain.text', 'Skjul kommentar felt');
  });

  it('Navigation between summary and pages', () => {
    cy.gotoAndComplete('changename');

    const triggerVariations: (Triggers | undefined)[] = [undefined, Triggers.ValidatePage, Triggers.ValidateAllPages];
    for (const trigger of triggerVariations) {
      injectExtraPageAndSetTriggers(trigger);

      const newFirstNameSummary = '[data-testid=summary-summary-2] > div > [data-testid=summary-item-simple]';
      const exampleSummary = '[data-testid=summary-summary-reference]';

      cy.get(appFrontend.navMenu).find('li > button').first().click();
      cy.get(appFrontend.changeOfName.newFirstName).clear().type(`Hello world`).blur();
      cy.get(appFrontend.changeOfName.newLastName).clear().blur();
      cy.get(appFrontend.changeOfName.sources).should('have.value', 'altinn');
      cy.get(appFrontend.nextButton).click();

      if (trigger === undefined) {
        cy.get(appFrontend.navMenu).find('li > button').eq(1).should('have.attr', 'aria-current', 'page');
      } else {
        cy.get(appFrontend.navMenu).find('li > button').eq(0).should('have.attr', 'aria-current', 'page');
        cy.get(appFrontend.errorReport).should('exist').and('contain.text', texts.requiredFieldLastName);
        cy.get(appFrontend.changeOfName.newLastName).type('a').blur();
        cy.get(appFrontend.nextButton).click();
      }

      if (trigger === Triggers.ValidateAllPages) {
        cy.get(appFrontend.errorReport).should('exist').and('contain.text', 'Du må fylle ut page3required');
        cy.get(appFrontend.navMenu).find('li > button').eq(1).click();
      } else if (trigger !== undefined) {
        cy.get(appFrontend.navMenu).find('li > button').eq(1).should('have.attr', 'aria-current', 'page');
      }

      cy.get(newFirstNameSummary).should('contain.text', `Hello world`);

      const assertErrorReport = () => {
        if (trigger === Triggers.ValidateAllPages) {
          cy.get(appFrontend.errorReport).should('exist').and('contain.text', 'Du må fylle ut page3required');
        } else {
          cy.get(appFrontend.errorReport).should('not.exist');
        }
      };

      // Going back to the first page via an 'edit' button and navigating to the summary page again. Also testing
      // that the back to summary button goes away when navigating via the navMenu instead.
      cy.get(exampleSummary).find('button').click();
      cy.get(appFrontend.backToSummaryButton).should('exist');
      cy.get(appFrontend.navMenu).find('li > button').last().click();
      assertErrorReport();
      cy.get(appFrontend.backToSummaryButton).should('not.exist');
      cy.get(appFrontend.navMenu).find('li > button').eq(1).click();
      assertErrorReport();
      cy.get(exampleSummary).find('button').click();
      assertErrorReport();
      cy.get(appFrontend.backToSummaryButton).should('exist').click();
      cy.get(appFrontend.backToSummaryButton).should('not.exist');
      assertErrorReport();
      cy.get(appFrontend.navMenu).find('li > button').last().click();
      cy.get(appFrontend.backToSummaryButton).should('not.exist');
      cy.get(appFrontend.navMenu).find('li > button').eq(1).click();
      assertErrorReport();
      cy.get(appFrontend.backButton).click();
      assertErrorReport();
      cy.get(appFrontend.navMenu).find('li > button').eq(1).click();
      assertErrorReport();

      // Sending in always validates all pages
      cy.get(appFrontend.sendinButton).click();
      cy.get(appFrontend.errorReport).should('exist').and('contain.text', 'Du må fylle ut page3required');
    }
  });

  it('Navigation to fields on other pages outside the summary should not show the back-to-summary button', () => {
    cy.gotoAndComplete('changename');
    injectExtraPageAndSetTriggers();
    cy.get(appFrontend.navMenu).find('li > button').first().click();
    cy.get(appFrontend.changeOfName.newLastName).clear().blur();
    cy.get(appFrontend.navMenu).find('li > button').last().click();
    cy.get('#page3-submit').click();
    cy.get(appFrontend.errorReport).should('exist').and('contain.text', 'Du må fylle ut page3required');
    cy.get(appFrontend.errorReport).should('exist').and('contain.text', texts.requiredFieldLastName);

    // Clicking the error should lead us to the first page
    cy.get(appFrontend.errorReport).find(`li:contains("${texts.requiredFieldLastName}")`).find('button').click();
    cy.get(appFrontend.navMenu).find('li > button').first().should('have.attr', 'aria-current', 'page');

    // The 'back to summary' button should not be here, and when we click 'next' we should land on the next
    // page (not the page we came from)
    cy.get(appFrontend.backToSummaryButton).should('not.exist');
    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.navMenu).find('li > button').eq(1).should('have.attr', 'aria-current', 'page');
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
        order: ['form', 'summary', 'lastPage'],
      },
    });
  });
}
