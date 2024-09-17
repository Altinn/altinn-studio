import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Common } from 'test/e2e/pageobjects/common';

import type { CompInputExternal } from 'src/layout/Input/config.generated';

const appFrontend = new AppFrontend();
const mui = new Common();

describe('Auto save behavior', () => {
  it('onChangeFormData: Should save form data when interacting with form element(checkbox) but not on navigation', () => {
    let formDataReqCounter = 0;
    cy.interceptLayoutSetsUiSettings({ autoSaveBehavior: 'onChangeFormData' });
    cy.goto('group').then(() => {
      cy.intercept('PATCH', '**/data/**', () => {
        formDataReqCounter++;
      }).as('saveFormData');
      cy.get(appFrontend.group.prefill.liten).check();
      cy.wait('@saveFormData').then(() => {
        expect(formDataReqCounter).to.be.eq(1);
      });
      cy.get(appFrontend.nextButton).clickAndGone();
      cy.get(appFrontend.backButton).clickAndGone();

      // Doing an extra wait to be sure no request is sent to backend
      cy.waitUntilSaved();
      cy.waitUntilNodesReady();
      cy.waitForNetworkIdle(100);
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(100).then(() => {
        expect(formDataReqCounter).to.be.eq(1);
      });
    });
  });

  it('onChangePage: Should not save form when interacting with form element(checkbox), but should save on navigating between pages', () => {
    let formDataReqCounter = 0;
    cy.interceptLayoutSetsUiSettings({ autoSaveBehavior: 'onChangePage' });

    cy.goto('group').then(() => {
      cy.intercept('PATCH', '**/data/**', () => {
        formDataReqCounter++;
      }).as('saveFormData');
      cy.get(appFrontend.group.prefill.liten).check();
      // Doing a hard wait to be sure no request is sent to backend
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000).then(() => {
        expect(formDataReqCounter).to.be.eq(0);
      });

      // NavigationButtons
      cy.get(appFrontend.nextButton).clickAndGone();
      cy.wait('@saveFormData').then(() => {
        expect(formDataReqCounter).to.be.eq(1);
      });

      // Clicking the back button does not save anything, because we didn't
      // change anything in the form data worth saving
      cy.get(appFrontend.backButton).clickAndGone();

      cy.navPage('prefill').should('have.attr', 'aria-current', 'page');
      cy.get(appFrontend.group.prefill.liten).should('be.visible');

      // Go forward again, change something and then observe the back button saves
      cy.get(appFrontend.nextButton).clickAndGone();
      cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
      cy.get(appFrontend.backButton).clickAndGone();
      cy.wait('@saveFormData').then(() => {
        expect(formDataReqCounter).to.be.eq(2);
      });

      // NavigationBar
      cy.get(appFrontend.group.prefill.middels).check();
      cy.get(appFrontend.navMenu).findByRole('button', { name: '2. repeating' }).click();
      cy.wait('@saveFormData').then(() => {
        expect(formDataReqCounter).to.be.eq(3);
      });

      // Icon previous button
      cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).uncheck();
      cy.get(appFrontend.prevButton).clickAndGone();
      cy.wait('@saveFormData').then(() => {
        expect(formDataReqCounter).to.be.eq(4);
      });
    });
  });

  (['current', 'all'] as const).forEach((pages) => {
    it(`should run save before single field validation with navigation trigger ${pages || 'undefined'}`, () => {
      cy.interceptLayoutSetsUiSettings({ autoSaveBehavior: 'onChangePage' });
      cy.interceptLayout('changename', (component) => {
        if (component.type === 'NavigationButtons') {
          component.validateOnNext = { page: pages, show: ['All'] };
        }
        if (component.id === 'newFirstName') {
          // TODO(Validation): Once it is possible to treat custom validations as required, this can be removed.
          (component as CompInputExternal).showValidations = [];
        }
      });

      cy.goto('changename');
      let formDataReqCounter = 0;
      cy.intercept('PATCH', '**/data/**', () => {
        formDataReqCounter++;
      }).as('saveFormData');

      // The newFirstName field has a trigger for single field validation, and it should cause a very specific error
      // message to appear if the field is set to 'test'. Regardless of the trigger on page navigation, if we're saving
      // the data on page navigation, the error message should appear (because the field is set to trigger it).
      cy.get(appFrontend.changeOfName.newFirstName).type('test');

      cy.get(appFrontend.changeOfName.newMiddleName).type('Kråka');
      cy.get(appFrontend.changeOfName.confirmChangeName)
        .findByRole('checkbox', {
          name: /Ja[a-z, ]*/,
        })
        .check();
      cy.get(appFrontend.changeOfName.reasonRelationship).click();
      cy.get(appFrontend.changeOfName.reasonRelationship).type('hello world');
      cy.get(appFrontend.changeOfName.dateOfEffect).siblings().findByRole('button').click();
      cy.get(mui.selectedDate).click();

      cy.get(appFrontend.nextButton).click();
      cy.wait('@saveFormData').then(() => {
        expect(formDataReqCounter).to.be.eq(1);
      });

      // None of the triggers should cause the page to change, because all of them should be triggered validation
      // and stopped by the error message.
      cy.navPage('form').should('have.attr', 'aria-current', 'page');

      let expectedErrors: string[] = [];
      if (pages == 'current') {
        expectedErrors = ['Du må fylle ut nytt etternavn', texts.testIsNotValidValue];
      } else if (pages == 'all') {
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

  ([undefined, 'current', 'currentAndPrevious', 'all'] as const).forEach((validateOnNext) => {
    it(`should run save before single field validation with validateOnNext = ${validateOnNext || 'undefined'}`, () => {
      cy.interceptLayoutSetsUiSettings({ autoSaveBehavior: 'onChangePage' });
      cy.interceptLayout('changename', (component) => {
        if (component.type === 'NavigationButtons') {
          component.validateOnNext = validateOnNext
            ? {
                page: validateOnNext,
                show: ['All'],
              }
            : undefined;
        }
      });

      cy.goto('changename');
      let saveFormDataCounter = 0;
      cy.intercept('PATCH', '**/data/**', () => {
        saveFormDataCounter++;
      }).as('saveFormData');

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

      cy.get(appFrontend.nextButton).click();
      cy.wait('@saveFormData').then(() => {
        expect(saveFormDataCounter).to.be.eq(1);
      });

      if (validateOnNext === undefined) {
        // We moved to the next page here, as there was nothing stopping it
        cy.navPage('summary').should('have.attr', 'aria-current', 'page');
        cy.gotoNavPage('form');
      } else {
        // None of the triggers should cause the page to change, because all of them should be triggered validation
        // and stopped by the error message.
        cy.navPage('form').should('have.attr', 'aria-current', 'page');
      }

      let expectedErrors: string[] = [];
      if (validateOnNext == 'current' || validateOnNext === 'currentAndPrevious') {
        expectedErrors = ['Du må fylle ut nytt etternavn', texts.testIsNotValidValue];
      } else if (validateOnNext == 'all') {
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

  it('new list items from the backend should never trigger runaway saving', () => {
    let formDataReqCounter = 0;
    cy.intercept('PATCH', '**/data/**', () => {
      formDataReqCounter++;
    }).as('saveFormData');

    cy.gotoHiddenPage('conflicting-options');
    cy.get('#group-animals-table-body tr').eq(0).find('td').eq(3).should('have.text', 'Svart');

    cy.waitUntilSaved();
    cy.get('#group-animals').then(() => {
      // The form has loaded completely, and the labels have been saved to the data model. Let's reset the counter
      // to make sure we only count the requests that are made after this point.
      formDataReqCounter = 0;
    });

    cy.findByRole('button', { name: 'Rediger Katt' }).click();
    cy.get('#animalColor-0').click();
    cy.findByRole('option', { name: 'Grønn' }).click(); // The problematic list is only added if green is selected
    cy.get('body').type('{esc}'); // Close the combobox
    cy.findByRole('button', { name: 'Lagre og lukk' }).click();

    // We used to have a bug where the backend code that splits the colors into separate strings in a List<string>
    // in the data model would cause the frontend to think the data model in the frontend was newer than the backend,
    // meaning it would save the data model with an empty list, causing the backend to again split the colors into
    // separate strings, and such an infinite loop of saving would occur. In order to make sure this never happens
    // again, we'll do what we shouldn't, and wait for at least 2 debounce timeouts to make sure we don't trigger
    // runaway saving.

    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);

    cy.then(() => {
      expect(formDataReqCounter).to.be.eq(1);
    });
  });
});
