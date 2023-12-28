import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Common } from 'test/e2e/pageobjects/common';

import { Triggers } from 'src/layout/common.generated';

const appFrontend = new AppFrontend();
const mui = new Common();

describe('Auto save behavior', () => {
  it('onChangeFormData: Should save form data when interacting with form element(checkbox) but not on navigation', () => {
    let putFormDataCounter = 0;
    cy.interceptLayoutSetsUiSettings({ autoSaveBehavior: 'onChangeFormData' });
    cy.goto('group').then(() => {
      cy.intercept('PUT', '**/data/**', () => {
        putFormDataCounter++;
      }).as('putFormData');
      cy.get(appFrontend.group.prefill.liten).dsCheck();
      cy.wait('@putFormData').then(() => {
        expect(putFormDataCounter).to.be.eq(1);
      });
      cy.get(appFrontend.nextButton).clickAndGone();
      cy.get(appFrontend.backButton).clickAndGone();
      // Doing a hard wait to be sure no request is sent to backend
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000).then(() => {
        expect(putFormDataCounter).to.be.eq(1);
      });
    });
  });

  it('onChangePage: Should not save form when interacting with form element(checkbox), but should save on navigating between pages', () => {
    let putFormDataCounter = 0;
    cy.interceptLayoutSetsUiSettings({ autoSaveBehavior: 'onChangePage' });

    cy.goto('group').then(() => {
      cy.intercept('PUT', '**/data/**', () => {
        putFormDataCounter++;
      }).as('putFormData');
      cy.get(appFrontend.group.prefill.liten).dsCheck();
      // Doing a hard wait to be sure no request is sent to backend
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000).then(() => {
        expect(putFormDataCounter).to.be.eq(0);
      });

      // NavigationButtons
      cy.get(appFrontend.nextButton).clickAndGone();
      cy.wait('@putFormData').then(() => {
        expect(putFormDataCounter).to.be.eq(1);
      });

      // Clicking the back button does not save anything, because we didn't
      // change anything in the form data worth saving
      cy.get(appFrontend.backButton).clickAndGone();
      cy.navPage('prefill').should('have.attr', 'aria-current', 'page');

      // Go forward again, change something and then observe the back button saves
      cy.get(appFrontend.nextButton).clickAndGone();
      cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();
      cy.get(appFrontend.backButton).clickAndGone();
      cy.wait('@putFormData').then(() => {
        expect(putFormDataCounter).to.be.eq(2);
      });

      // NavigationBar
      cy.get(appFrontend.group.prefill.middels).dsCheck();
      cy.get(appFrontend.navMenu).findByRole('button', { name: '2. repeating' }).click();
      cy.wait('@putFormData').then(() => {
        expect(putFormDataCounter).to.be.eq(3);
      });

      // Icon previous button
      cy.get(appFrontend.group.showGroupToContinue).find('input').dsUncheck();
      cy.get(appFrontend.prevButton).clickAndGone();
      cy.wait('@putFormData').then(() => {
        expect(putFormDataCounter).to.be.eq(4);
      });
    });
  });

  [Triggers.ValidatePage, Triggers.ValidateAllPages].forEach((trigger) => {
    /**
     * TODO(1508):
     * This test is skipped because validation is not triggered by the new navigation refactor.
     * This will be fixed in combination with #1506.
     * Note: There may be a need to adjust the test to actually change some data before navigating to the next
     * page, as was done for the tests above.
     */
    it.skip(`should run save before single field validation with navigation trigger ${trigger || 'undefined'}`, () => {
      cy.interceptLayoutSetsUiSettings({ autoSaveBehavior: 'onChangePage' });
      cy.interceptLayout('changename', (component) => {
        if (component.type === 'NavigationButtons') {
          component.triggers = trigger ? [trigger] : [];
        }
      });

      cy.goto('changename');
      let putFormDataCounter = 0;
      cy.intercept('PUT', '**/data/**', () => {
        putFormDataCounter++;
      }).as('putFormData');

      // The newFirstName field has a trigger for single field validation, and it should cause a very specific error
      // message to appear if the field is set to 'test'. Regardless of the trigger on page navigation, if we're saving
      // the data on page navigation, the error message should appear (because the field is set to trigger it).
      cy.get(appFrontend.changeOfName.newFirstName).type('test');

      cy.get(appFrontend.changeOfName.newMiddleName).type('Kråka');
      cy.get(appFrontend.changeOfName.confirmChangeName).find('input').dsCheck();
      cy.get(appFrontend.changeOfName.reasonRelationship).click();
      cy.get(appFrontend.changeOfName.reasonRelationship).type('hello world');
      cy.get(appFrontend.changeOfName.dateOfEffect).siblings().findByRole('button').click();
      cy.get(mui.selectedDate).click();

      cy.get(appFrontend.nextButton).clickAndGone();
      cy.wait('@putFormData').then(() => {
        expect(putFormDataCounter).to.be.eq(1);
      });

      // None of the triggers should cause the page to change, because all of them should be triggered validation
      // and stopped by the error message.
      cy.navPage('form').should('have.attr', 'aria-current', 'page');

      let expectedErrors: string[] = [];
      if (trigger == Triggers.ValidatePage) {
        expectedErrors = ['Du må fylle ut nytt etternavn', texts.testIsNotValidValue];
      } else if (trigger == Triggers.ValidateAllPages) {
        expectedErrors = [
          'Du må fylle ut nytt etternavn',
          texts.testIsNotValidValue,
          'Må summeres opp til 100%', // Validation on the future 'grid' page
        ];
      } else {
        expectedErrors = [
          // We don't validate the whole page, but the first name field has a trigger for single field validation,
          // so that should be triggered when we're saving the data on page navigation.
          texts.testIsNotValidValue,
        ];
      }

      cy.get(appFrontend.errorReport).findAllByRole('listitem').should('have.length', expectedErrors.length);
      for (const error of expectedErrors) {
        cy.get(appFrontend.errorReport).should('contain.text', error);
      }

      cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newFirstName))
        .should('have.text', texts.testIsNotValidValue)
        .then((error) => {
          cy.wrap(error).find('a[href="https://www.altinn.no/"]').should('exist');
        });
    });
  });
});
