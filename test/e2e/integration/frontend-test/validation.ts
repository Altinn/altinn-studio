import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Common } from 'test/e2e/pageobjects/common';

import type { IDataModelPatchResponse } from 'src/features/formData/types';

const appFrontend = new AppFrontend();
const mui = new Common();

describe('Validation', () => {
  it('Required field validation should be visible on submit, not on blur', () => {
    cy.goto('changename');

    // This field has server-side validations marking it as required,
    // Since this component shows backend validations immediately, it should show up
    // TODO(Validation): Once it is possible to treat custom validations as required, this test should be updated
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newFirstName)).should(
      'have.text',
      texts.requiredFieldFromBackend,
    );
    cy.get(appFrontend.changeOfName.newFirstName).type('Some value');
    cy.get(appFrontend.changeOfName.newFirstName).blur();
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newFirstName)).should('not.exist');
    cy.get(appFrontend.changeOfName.newFirstName).clear();

    cy.get(appFrontend.changeOfName.newMiddleName).type('Some value');
    cy.get(appFrontend.changeOfName.newMiddleName).blur();
    cy.get(appFrontend.changeOfName.newMiddleName).focus();
    cy.get(appFrontend.changeOfName.newMiddleName).clear();
    cy.get(appFrontend.changeOfName.newMiddleName).blur();
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newMiddleName)).should('not.exist');

    cy.get(appFrontend.changeOfName.newMiddleName).type('Some middle name');

    cy.get(appFrontend.changeOfName.confirmChangeName)
      .findByRole('checkbox', {
        name: /Ja[a-z, ]*/,
      })
      .check();
    cy.get(appFrontend.changeOfName.reasonRelationship).type('test');
    cy.get(appFrontend.changeOfName.dateOfEffect).siblings().children(mui.buttonIcon).click();
    cy.get(mui.selectedDate).click();

    cy.get(appFrontend.nextButton).click();

    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newFirstName)).should(
      'contain.text',
      texts.requiredFieldFirstName,
    );
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newFirstName)).should(
      'contain.text',
      texts.requiredFieldFromBackend,
    );
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newMiddleName)).should('not.exist');
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newLastName)).should(
      'have.text',
      texts.requiredFieldLastName,
    );
  });

  it('Custom field validation - warning/info/success', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('test');

    // Error
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newFirstName))
      .should('have.text', texts.testIsNotValidValue)
      .then((error) => {
        cy.wrap(error).find('a[href="https://www.altinn.no/"]').should('exist');
      });

    const validationTypeMap = {
      warning: {
        value: 'test',
        message: texts.testIsNotValidValue,
      },
      info: {
        value: 'info',
        message: texts.infoMessage,
      },
      success: {
        value: 'success',
        message: texts.successMessage,
      },
    };

    for (const [type, { value, message }] of Object.entries(validationTypeMap)) {
      const realType = type as keyof typeof validationTypeMap;
      const field = appFrontend.changeOfName.newMiddleName;
      cy.get(field).clear();
      cy.get(field).type(value);
      cy.get(`#form-content-newMiddleName`).findByRole('alert', { name: message }).should('exist');

      // Should not have any other messages
      for (const [otherType, { message: otherMessage }] of Object.entries(validationTypeMap)) {
        if (otherType !== realType) {
          cy.findByRole('alert', { name: otherMessage }).should('not.exist');
        }
      }
    }
  });

  it('Page validation on clicking next', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).clear();
    cy.get(appFrontend.changeOfName.newFirstName).type('test');
    cy.get(appFrontend.changeOfName.confirmChangeName)
      .findByRole('checkbox', {
        name: /Ja[a-z, ]*/,
      })
      .check();
    cy.navPage('form').should('have.attr', 'aria-current', 'page');
    cy.get(appFrontend.nextButton).scrollIntoView();
    cy.get(appFrontend.nextButton).should('be.inViewport');
    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.errorReport)
      .should('be.inViewport')
      .should('contain.text', texts.errorReport)
      .should('contain.text', texts.requiredFieldLastName)
      .should('contain.text', texts.requiredFieldDateFrom)
      .should('contain.text', texts.next);
    cy.navPage('form').should('have.attr', 'aria-current', 'page');

    // Make sure all the buttons in the form are now inside errorReport, not outside of it.
    // - 4 of the button roles belong to each of the errors in the report
    // - 2 of the button roles belong to the buttons on the bottom of the form (print, next)
    cy.get(appFrontend.errorReport).findAllByRole('listitem').should('have.length', 4);
    cy.get(appFrontend.errorReport)
      .findAllByRole('button')
      .should('have.length', 4 + 2);

    const lastNameError = appFrontend.fieldValidation(appFrontend.changeOfName.newLastName);
    cy.get(lastNameError).should('exist').should('not.be.inViewport');
    cy.get(appFrontend.changeOfName.newLastName).should('not.be.focused');

    cy.get(appFrontend.errorReport)
      .get(`button:contains("${texts.requiredFieldLastName}")`)
      .should('be.inViewport')
      .click();

    // Observe that we scrolled to show the error message and have the field focussed
    cy.get(lastNameError).should('be.inViewport');
    cy.get(appFrontend.changeOfName.newLastName).should('be.focused');

    // Go to the summary page
    cy.get(appFrontend.navMenu).find('li > button').last().click();
    cy.get(appFrontend.errorReport)
      .should('contain.text', texts.errorReport)
      .should('contain.text', texts.requiredFieldLastName)
      .should('contain.text', texts.requiredFieldDateFrom);
    cy.get(lastNameError).should('not.exist');

    // Click the error text, which should lead us back to the change name form and focus the field
    cy.get(appFrontend.errorReport).get(`button:contains("${texts.requiredFieldLastName}")`).click();

    cy.get(lastNameError).should('exist').should('be.inViewport');
    cy.get(appFrontend.changeOfName.newLastName).should('be.focused');
  });

  it('Validation on uploaded attachment type', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.upload).selectFile('test/e2e/fixtures/test.png', { force: true });
    cy.get(appFrontend.toast).should('contain.text', texts.attachmentError);
  });

  it('Validation on uploaded attachment type with tag', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.uploadWithTag.uploadZone).selectFile('test/e2e/fixtures/test.pdf', { force: true });
    cy.get(appFrontend.changeOfName.uploadWithTag.saveTag).click({ multiple: true });
    cy.get(appFrontend.changeOfName.uploadWithTag.error).should(
      'not.contain.text',
      appFrontend.changeOfName.uploadWithTag.unwantedChar,
    );
    cy.gotoNavPage('grid');
    cy.get(appFrontend.sendinButton).click();
    cy.get(appFrontend.errorReport).should('not.contain.text', appFrontend.changeOfName.uploadWithTag.unwantedChar);
  });

  it('Client side validation from json schema', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('a');

    // Tests regex validation in schema
    cy.get(appFrontend.changeOfName.newLastName).type('client');
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newLastName)).should('have.text', texts.clientSide);
    cy.get(appFrontend.changeOfName.newLastName).clear();

    // Tests max length validation in schema
    cy.get(appFrontend.changeOfName.newMiddleName).type(
      'very long middle name that is over 50 characters which is the limit',
    );
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newMiddleName)).should(
      'contain.text',
      texts.clientSide,
    );

    // Hiding the field should remove the validation
    cy.get(appFrontend.changeOfName.newLastName).type('hideNext');
    cy.get(appFrontend.changeOfName.newMiddleName).should('exist');
    cy.changeLayout((component) => {
      if (component.id === 'newMiddleName') {
        component.hidden = ['equals', ['component', 'newLastName'], 'hideNext'];
      }
    });
    cy.get(appFrontend.changeOfName.newMiddleName).should('not.exist');
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newMiddleName)).should('not.exist');

    const expectedErrors = [
      {
        text: 'Må summeres opp til 100%',
        elementIdToFocus: 'fordeling-total',
      },
      {
        text: 'Bruk 60 eller færre tegn',
        elementIdToFocus: 'changeNameTo',
      },
      {
        text: 'Du må fylle ut dato for navneendring',
        elementIdToFocus: 'dateOfEffect',
      },
      {
        text: 'Du må fylle ut bekreftelse av navn',
        elementIdToFocus: 'confirmChangeName',
      },
    ];

    // Clicking the submit button should display all validation errors on the bottom, and clicking them
    // should move focus to the correct elements in the form.
    cy.gotoNavPage('grid');
    cy.get(appFrontend.sendinButton).click();
    cy.get(appFrontend.errorReport).find('li').should('have.length', expectedErrors.length);
    for (const { text, elementIdToFocus } of expectedErrors) {
      cy.get(appFrontend.errorReport).should('contain.text', text);
      cy.get(`button:contains("${text}")`).click();
      cy.focused().closest('[data-componentid]').should('have.attr', 'data-componentid', elementIdToFocus);
    }
  });

  it('Task validation', () => {
    cy.intercept('**/active', []).as('noActiveInstances');

    cy.intercept(
      { method: 'PUT', url: '**/process/next*', times: 1 },
      {
        statusCode: 409,
        body: {
          validationIssues: [
            {
              severity: 1,
              code: 'error',
              description: 'task validation',
            },
          ],
        },
      },
    );

    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.waitForLoad();
    cy.get(appFrontend.errorReport).should('not.exist');
    cy.get(appFrontend.sendinButton).click(); // Should fail the first time due to validation
    cy.get(appFrontend.errorReport).should('contain.text', 'task validation');
    cy.get(appFrontend.sendinButton).click(); // Second time should succeed
    cy.get(appFrontend.changeOfName.currentName).should('be.visible');
  });

  it('Validations are removed for hidden fields', () => {
    // Init and add data to group
    cy.goto('group');
    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.currentValue).type('123');
    cy.get(appFrontend.group.newValue).type('321');

    // Create validation error
    cy.get(appFrontend.group.mainGroup).find(appFrontend.group.editContainer).find(appFrontend.group.next).click();
    cy.get(appFrontend.group.comments).type('test');
    cy.get(appFrontend.fieldValidation('comments-0-0')).should('have.text', texts.testIsNotValidValue);
    cy.get(appFrontend.errorReport).should('exist').should('be.visible');

    // Hide field that contains validation error and verify validation messages are gone
    cy.get(appFrontend.group.hideCommentField).findByRole('checkbox', { name: 'Ja' }).check();
    cy.get(appFrontend.group.comments).should('not.exist');
    cy.get(appFrontend.fieldValidation('comments-0-0')).should('not.exist');
    cy.get(appFrontend.errorReport).should('not.exist');

    cy.changeLayout((component) => {
      if (component.type === 'NavigationButtons') {
        component.validateOnNext = { page: 'current', show: ['All'] };
      }
      if (component.id === 'sendersName' && component.type === 'Input') {
        // Make sure changing this field triggers single field validation
        component.showValidations = ['AllExceptRequired'];
      }
    });

    // Verify that validation message is shown, but also make sure only one error message is shown
    // (there is a hidden layout that also binds to the same location, and a bug caused it to show
    // up twice because of that component on the hidden layout)
    cy.gotoNavPage('hide');
    cy.get(appFrontend.group.sendersName).type('tull og tøys');

    // Try to click next to observe the error report
    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.errorReport).should('contain.text', 'Tullevalidering');
    cy.get(appFrontend.errorReport).findAllByRole('listitem').should('have.length', 1);

    // The navigation should be stopped, so we should still be on the 'hide' page
    cy.navPage('hide').should('have.attr', 'aria-current', 'page');
  });

  it('List component: validation messages should only show up once', () => {
    cy.goto('datalist');
    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.errorReport)
      .should('be.inViewport')
      .should('contain.text', texts.errorReport)
      .should('contain.text', texts.next);
    cy.get(appFrontend.errorReport).find('li:contains("Du må fylle ut hvem gjelder saken?")').should('have.length', 1);
  });

  it('Clicking the error report should focus the correct field', () => {
    cy.interceptLayout('group', (component) => {
      if (
        (component.id === 'comments' || component.id === 'newValue' || component.id === 'currentValue') &&
        (component.type === 'Input' || component.type === 'TextArea')
      ) {
        component.required = true;
      }
      if (component.type === 'RepeatingGroup' && component.id === 'mainGroup') {
        component.validateOnSaveRow = ['All'];
      }
      if (component.type === 'NavigationButtons') {
        component.validateOnNext = { page: 'current', show: ['All'] };
      }
    });
    cy.goto('group');

    cy.get(appFrontend.group.prefill.liten).check();
    cy.get(appFrontend.group.prefill.stor).check();
    cy.get(appFrontend.nextButton).clickAndGone();
    cy.navPage('repeating').should('have.attr', 'aria-current', 'page');

    // Check that showGroupToContinue can be focused when clicked
    cy.get(appFrontend.nextButton).click();
    cy.navPage('repeating').should('have.attr', 'aria-current', 'page');

    cy.get(appFrontend.errorReport).findAllByRole('listitem').should('have.length', 1);
    cy.get(appFrontend.errorReport).findByText(texts.requiredOpenRepGroup).click();
    cy.get(appFrontend.group.showGroupToContinue).find('input').should('be.focused');

    // Check that clicking the error focuses a component inside a group
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.next).click();
    cy.get(appFrontend.group.row(2).nestedGroup.row(0).comments).should('be.visible');
    cy.get(appFrontend.group.saveMainGroup).click();
    cy.get(appFrontend.group.editContainer).should('be.visible');
    cy.get(appFrontend.errorReport).findAllByRole('listitem').should('have.length', 3);
    cy.get(appFrontend.errorReport).findByText('Du må fylle ut 1. endre fra').click();
    cy.get(appFrontend.group.row(2).currentValue).should('exist').and('be.focused');
    cy.get(appFrontend.group.row(2).currentValue).type('123');

    cy.get(appFrontend.errorReport).findByText('Du må fylle ut 2. endre verdi 123 til').click();
    cy.get(appFrontend.group.row(2).newValue).should('exist').and('be.focused');
    cy.get(appFrontend.group.saveMainGroup).click();
    cy.get(appFrontend.errorReport).findAllByRole('listitem').should('have.length', 2);

    // Validation message should now have changed, since we filled out currentValue and saved
    cy.get(appFrontend.errorReport).findByText('Du må fylle ut 2. endre verdi 123 til').should('be.visible');
    cy.get(appFrontend.group.row(2).deleteBtn).click();

    // Check that nested group with multipage gets focus
    cy.get(appFrontend.group.row(0).editBtn).click();
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.next).click();
    cy.get(appFrontend.group.row(0).nestedGroup.row(0).comments).type('comment');
    cy.get(appFrontend.group.saveSubGroup).click();
    cy.get(appFrontend.group.addNewItemSubGroup).click();
    cy.get(appFrontend.group.saveSubGroup).click();
    cy.get(appFrontend.group.row(0).nestedGroup.row(0).editBtn).click();
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.back).click();
    cy.get(appFrontend.group.row(0).editBtn).click();
    cy.get(appFrontend.group.row(2).editBtn).click();
    cy.get(appFrontend.errorReport).findByText(texts.requiredComment).click();
    cy.get(appFrontend.group.row(0).nestedGroup.row(1).comments).should('be.focused');

    // Check that switching page works
    cy.get(appFrontend.group.row(0).nestedGroup.row(1).comments).type('comment2');
    cy.get(appFrontend.group.row(0).editBtn).click();
    cy.gotoNavPage('summary');
    cy.get(appFrontend.sendinButton).click();
    cy.get(appFrontend.errorReport).findAllByRole('listitem').should('have.length', 1);
    cy.get(appFrontend.errorReport).findByText(texts.requiredSendersName).click();
    cy.get(appFrontend.group.sendersName).should('be.focused');
    cy.get(appFrontend.group.sendersName).type('hello world');
    cy.get(appFrontend.errorReport).should('not.exist');
    cy.get(appFrontend.prevButton).click();
    cy.navPage('Kjæledyr').should('have.attr', 'aria-current', 'page');
    cy.get(appFrontend.prevButton).click();

    cy.changeLayout((component) => {
      if (
        component.type === 'RepeatingGroup' &&
        component.id === 'mainGroup' &&
        'tableColumns' in component &&
        component.tableColumns
      ) {
        // As the component is hidden in edit mode, and not shown in the table for editing, it should not be
        // showing any validation messages.
        component.tableColumns.currentValue.showInExpandedEdit = false;
      }
    });

    // Attempting to save the group with one remaining required field should let us focus that field,
    // but the field not shown in the expanded edit should not be focused
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.saveMainGroup).click();

    // The currentValue field is required, but as it's implicitly hidden in the expanded edit, it should not produce
    // a validation message or be visible in the error report.
    cy.get(appFrontend.errorReport).findAllByRole('listitem').should('have.length', 1);
    cy.get(appFrontend.group.editContainer).should('be.visible');
    cy.get(appFrontend.errorReport).findByText('Du må fylle ut 2. endre verdi til').click();
    cy.get(appFrontend.group.row(2).newValue).should('exist').and('be.focused');
    cy.get(appFrontend.group.row(2).currentValue).should('not.exist');

    // Even though the currentValue field is hidden, the value should still be displayed in the table
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').eq(0).find('td').eq(0).should('have.text', 'NOK 1');
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').eq(1).find('td').eq(0).should('have.text', 'NOK 1 233');

    // Filling out the remaining field should let us save the group and hide leftover errors
    cy.get(appFrontend.group.row(2).newValue).type('456');
    cy.get(appFrontend.group.saveMainGroup).click();
    cy.get(appFrontend.group.editContainer).should('not.exist');
    cy.get(appFrontend.errorReport).should('not.exist');

    cy.changeLayout((component) => {
      if (
        component.type === 'RepeatingGroup' &&
        component.id === 'mainGroup' &&
        'edit' in component &&
        component.edit
      ) {
        // In the 'onlyTable' mode, there is no option to edit a row, so we should not open the row in edit mode
        // to focus a component either.
        component.edit.mode = 'onlyTable';
      }
    });

    // These components are not editable in the table yet, so even though the edit button
    // is gone now, they're not to be found.
    cy.get(appFrontend.group.edit).should('not.exist');
    cy.get(appFrontend.group.row(0).currentValue).should('not.exist');
    cy.get(appFrontend.group.row(2).currentValue).should('not.exist');
    cy.get(appFrontend.group.row(0).newValue).should('not.exist');
    cy.get(appFrontend.group.editContainer).should('not.exist');

    cy.changeLayout((component) => {
      if (
        component.type === 'RepeatingGroup' &&
        component.id === 'mainGroup' &&
        'tableColumns' in component &&
        component.tableColumns
      ) {
        component.tableColumns.currentValue.editInTable = undefined;
        component.tableColumns.newValue.editInTable = true;
      }
      if (component.type === 'NavigationButtons') {
        // When components are visible in the table, the validation trigger on the group itself stops having an effect,
        // as there is no way for the user to say they're 'done' editing a row.
        component.validateOnNext = { page: 'current', show: ['All'] };
      }
    });

    // Components are now visible in the table
    cy.get(appFrontend.group.row(0).currentValue).should('have.attr', 'readonly', 'readonly');
    cy.get(appFrontend.group.row(2).currentValue).should('not.have.attr', 'readonly');
    cy.get(appFrontend.group.row(0).newValue).should('have.attr', 'readonly', 'readonly');

    // Delete the row, start over, and observe that the currentValue now exists as a field in the table and
    // produces a validation message if not filled out. We need to use the 'next' button to trigger validation.
    cy.get(appFrontend.group.row(2).deleteBtn).click();
    cy.get(appFrontend.group.row(2).currentValue).should('not.exist');
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.row(2).currentValue).should('exist');
    cy.get(appFrontend.group.row(2).newValue).should('exist');
    cy.get(appFrontend.group.editContainer).should('not.exist');
    cy.get(appFrontend.errorReport).should('not.exist');
    cy.get(appFrontend.nextButton).click();
    cy.navPage('repeating').should('have.attr', 'aria-current', 'page');
    cy.get(appFrontend.errorReport).findAllByRole('listitem').should('have.length', 2);
    cy.get(appFrontend.errorReport).findByText('Du må fylle ut 1. endre fra').click();
    cy.get(appFrontend.group.row(2).currentValue).should('be.focused');
    cy.get(appFrontend.group.editContainer).should('not.exist');
    cy.get(appFrontend.errorReport).findByText('Du må fylle ut 2. endre verdi til').click();
    cy.get(appFrontend.group.row(2).newValue).should('be.focused');
    cy.get(appFrontend.group.editContainer).should('not.exist');

    cy.changeLayout((component) => {
      if (
        component.type === 'RepeatingGroup' &&
        component.id === 'mainGroup' &&
        'tableColumns' in component &&
        component.tableColumns
      ) {
        // Components that are not editable in the table, when using the 'onlyTable' mode, are implicitly hidden
        component.tableColumns.currentValue.editInTable = false;
      }
    });

    cy.get(appFrontend.group.row(0).currentValue).should('not.exist');
    cy.get(appFrontend.group.row(0).newValue).should('exist');
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').eq(1).find('td').eq(0).should('have.text', 'NOK 1 233');
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').eq(2).find('td').eq(0).should('have.text', '');
    cy.get(appFrontend.group.row(2).currentValue).should('not.exist');
    cy.get(appFrontend.nextButton).click();
    cy.navPage('repeating').should('have.attr', 'aria-current', 'page');
    cy.get(appFrontend.errorReport).findAllByRole('listitem').should('have.length', 1);
    cy.get(appFrontend.errorReport).findByText('Du må fylle ut 2. endre verdi til').click();
    cy.get(appFrontend.group.row(2).newValue).should('be.focused');

    cy.changeLayout((component) => {
      if (
        component.type === 'RepeatingGroup' &&
        component.id === 'mainGroup' &&
        'edit' in component &&
        component.edit &&
        'tableColumns' in component &&
        component.tableColumns
      ) {
        // In regular mode, if the edit button is hidden, we should not open the row in edit mode to focus a component
        // because this isn't a mode the user would be able to reach either.
        component.edit.mode = 'showTable';
        component.edit.editButton = false;
        component.tableColumns.newValue.editInTable = undefined;
        component.tableColumns.currentValue.editInTable = undefined;
      }
    });

    // Go back to the first page and then here again to reset the repeating group after the change above
    cy.gotoNavPage('prefill');
    cy.gotoNavPage('repeating');

    cy.get(appFrontend.errorReport).findAllByRole('listitem').should('have.length', 1);
    cy.get(appFrontend.group.editContainer).should('not.exist');
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.editContainer).should('be.visible');
    cy.get(appFrontend.group.row(3).newValue).should('exist');
    cy.get(appFrontend.group.row(3).currentValue).should('not.exist');
    cy.get(appFrontend.group.saveMainGroup).click();
    cy.get(appFrontend.errorReport).findAllByRole('listitem').should('have.length', 2);
    cy.get(appFrontend.errorReport).findAllByText('Du må fylle ut 2. endre verdi til').eq(0).click();

    // We have no way to focus this field, because this component is hidden when the edit container is no longer
    // visible for this row. It's not technically a fully hidden component since it can still be edited when the
    // edit container was first opened, but by removing the edit button, we've made it impossible to reach the
    // component to focus it.
    //
    // Note that we're testing expected functionality here, but if you're actually implementing this in an app, you
    // should trigger validation before saving and closing the group row, so that the user cannot reach this state
    // (although they still could if refreshing the page, so it's not the best idea).
    // eslint-disable-next-line cypress/unsafe-to-chain-command
    cy.focused().should('have.text', 'Du må fylle ut 2. endre verdi til');

    // Clicking the next validation message should focus the component already open in editing mode
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.row(3).newValue).should('not.be.focused');
    cy.get(appFrontend.errorReport).findAllByText('Du må fylle ut 2. endre verdi til').eq(1).click();
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.row(3).newValue).should('be.focused');
  });

  it('Validates mime type on attachment', () => {
    cy.goto('changename');

    cy.get(appFrontend.changeOfName.upload).selectFile('test/e2e/fixtures/test.pdf', { force: true });

    cy.get(appFrontend.changeOfName.uploadedTable).should('be.visible');
    cy.get(appFrontend.changeOfName.uploadedTable)
      .find('tbody > tr')
      .eq(0)
      .find(appFrontend.changeOfName.uploadSuccess)
      .should('exist');

    cy.get(appFrontend.changeOfName.upload).selectFile('test/e2e/fixtures/test.png', { force: true });
    cy.get(appFrontend.toast).should('contain.text', texts.invalidFileExtension);
    cy.get(appFrontend.changeOfName.uploadedTable).find('tbody > tr').should('have.length', 1);

    cy.get(appFrontend.changeOfName.upload).selectFile('test/e2e/fixtures/test-invalid.pdf', { force: true });
    cy.get(appFrontend.toast).should('contain.text', texts.invalidMimeType);
    cy.get(appFrontend.changeOfName.uploadedTable).find('tbody > tr').should('have.length', 1);
  });

  it('Submitting should be rejected if validation fails on field hidden by pageOrderConfig', () => {
    cy.goto('changename');
    cy.fillOut('changename');

    cy.get(appFrontend.grid.bolig.percent).numberFormatClear();

    cy.get(appFrontend.grid.kredittkort.percent).numberFormatClear();
    cy.get(appFrontend.grid.kredittkort.percent).type('44');

    cy.get(appFrontend.grid.studie.percent).numberFormatClear();
    cy.get(appFrontend.grid.studie.percent).type('56');

    // When filling out the credit card field with 44%, there is a special validation that triggers and is added to
    // a field on a hidden page. Even though this should not happen, we should still not be able to continue, as
    // submitting the form now when there is a validation error should not be possible - and attempting it will cause
    // the dreaded 'unknown error' message to appear.
    cy.get(appFrontend.sendinButton).click();
    cy.get(appFrontend.errorReport).should('contain.text', 'Valideringsmelding på felt som aldri vises');
    cy.navPage('grid').should('have.attr', 'aria-current', 'page');
  });

  it('Submitting should be rejected if validation fails on field hidden using expression', () => {
    cy.interceptLayout('group', (c) => {
      if (c.type === 'Input' && c.id === 'sendersName') {
        c.hidden = ['equals', ['component', 'comments'], 'hideSendersName'];
      }
    });

    cy.goto('group');
    cy.get(appFrontend.navMenuButtons).should('have.length', 5);

    cy.gotoNavPage('hide');
    cy.get(appFrontend.group.sendersName).type('tull og tøys'); // Causes validation error

    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.addItemToGroup(2, 3, 'hideSendersName');
    cy.get(appFrontend.nextButton).click();
    cy.navPage('Kjæledyr').should('have.attr', 'aria-current', 'page');
    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.navMenuButtons).should('have.length', 5); // 'hide' page is still visible
    cy.navPage('hide').should('have.attr', 'aria-current', 'page');
    cy.get(appFrontend.group.sendersName).should('not.exist');
    cy.get(appFrontend.errorReport).should('not.exist');

    cy.gotoNavPage('summary');
    cy.get(appFrontend.sendinButton).click();
    cy.get(appFrontend.errorReport).should('contain.text', 'Tullevalidering');
  });

  it('Submitting should be rejected if validation fails on a field hidden using legacy dynamics', () => {
    cy.intercept('POST', '**/pages/order*', (req) => {
      req.reply((res) => {
        res.send({
          // Always reply with all pages, as none should be hidden using pageOrderConfig here
          body: ['prefill', 'repeating', 'repeating2', 'hide', 'summary'],
        });
      });
    });
    cy.intercept('GET', '**/api/ruleconfiguration/group', (req) => {
      req.reply((res) => {
        res.send({
          body: {
            data: {
              ruleConnection: {},
              conditionalRendering: {
                hideSendersName: {
                  selectedFunction: 'biggerThan10',
                  inputParams: {
                    number:
                      'Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[0].SkattemeldingEndringEtterFristNyttBelop-datadef-37132.value',
                  },
                  selectedAction: 'Hide',
                  selectedFields: {
                    abc123: 'sendersName',
                  },
                },
              },
            },
          },
        });
      });
    });

    cy.goto('group');
    cy.get(appFrontend.navMenuButtons).should('have.length', 5);

    cy.gotoNavPage('hide');
    cy.get(appFrontend.group.sendersName).type('tull og tøys'); // Causes validation error

    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.addItemToGroup(1, 11, 'whatever');
    cy.get(appFrontend.nextButton).click();
    cy.navPage('Kjæledyr').should('have.attr', 'aria-current', 'page');
    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.navMenuButtons).should('have.length', 5); // 'hide' page should be visible and active
    cy.navPage('hide').should('have.attr', 'aria-current', 'page');
    cy.get(appFrontend.group.sendersName).should('not.exist');
    cy.get(appFrontend.errorReport).should('not.exist');

    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.sendinButton).click();
    cy.get(appFrontend.errorReport).should('contain.text', 'Tullevalidering');
  });

  it('Submitting should be rejected if validation fails on page hidden using expression', () => {
    cy.interceptLayout(
      'group',
      () => undefined,
      (layoutSet) => {
        layoutSet.hide.data.hidden = ['equals', ['component', 'comments'], 'hidePage'];
      },
    );

    cy.goto('group');
    cy.get(appFrontend.navMenuButtons).should('have.length', 5);

    cy.gotoNavPage('hide');
    cy.get(appFrontend.group.sendersName).type('tull og tøys'); // Causes validation error

    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.addItemToGroup(2, 3, 'hidePage');
    cy.get(appFrontend.nextButton).click();
    cy.navPage('Kjæledyr').should('have.attr', 'aria-current', 'page');
    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.navMenuButtons).should('have.length', 4); // 'hide' page is now invisible
    cy.get(appFrontend.errorReport).should('not.exist');
    cy.navPage('summary').should('have.attr', 'aria-current', 'page');

    cy.get(appFrontend.sendinButton).click();
    cy.get(appFrontend.errorReport).should('contain.text', 'Tullevalidering');
  });

  it('Navigating to one task and navigating back should not produce error messages for hidden pages', () => {
    cy.goto('group');
    cy.gotoNavPage('summary');
    cy.get(appFrontend.sendinButton).click();
    cy.get(appFrontend.errorReport).findAllByRole('listitem').should('have.length', 2);

    cy.url().then((url) => {
      cy.visit(url.replace('Task_3', 'Task_5'));
    });

    cy.url().should('satisfy', (url) => url.endsWith('/Task_5/summary'));
    cy.findByRole('button', { name: /gå til riktig prosessteg/i }).should('be.visible');

    cy.url().then((url) => {
      cy.visit(url.replace('Task_5', 'Task_3'));
    });

    cy.url().should('satisfy', (url) => url.endsWith('/Task_3/summary'));

    cy.get(appFrontend.sendinButton).click();
    cy.get(appFrontend.errorReport).findAllByRole('listitem').should('have.length', 2);
  });

  it('should navigate and scroll to correct component when clicking error report', () => {
    cy.goto('changename');
    cy.gotoNavPage('grid');
    cy.get(appFrontend.sendinButton).click();
    cy.get(appFrontend.errorReport).findAllByRole('listitem').should('have.length', 6);
    cy.findByText('Du må fylle ut dato for navneendring').click();
    cy.findByLabelText(/Når vil du at navnendringen skal skje?/).should('be.inViewport');
  });

  describe('Falsy values', () => {
    it('should validate boolean fields as set in the data model even when they are set to false', () => {
      cy.interceptLayout('message', (component) => {
        if (component.id === 'falsyRadioButton') {
          component.hidden = false;
        }
      });
      cy.goto('message');

      cy.findByRole('radio', { name: 'False' }).click();
      cy.findByRole('button', { name: 'Send inn' }).click();

      // content from next page
      cy.findByText('Nåværende navn').should('exist');
    });

    it('should validate number fields as set in the data model when a falsy value is input', () => {
      cy.interceptLayout('message', (component) => {
        if (component.id === 'falsyInput') {
          component.hidden = false;
        }
      });
      cy.goto('message');

      cy.findByRole('textbox', { name: 'Input with falsy value *' }).type('0');
      cy.findByRole('button', { name: 'Send inn' }).click();

      // Content from next page
      cy.findByText('Nåværende navn').should('exist');
    });

    it('Should navigate and focus correct row in Likert component when clicking on error report', () => {
      cy.goto('likert');
      cy.findByRole('button', { name: /Send inn/ }).click();

      cy.findByRole('radiogroup', {
        name: 'Spørsmål Hører skolen på elevenes forslag? * Du må fylle ut hører skolen på elevenes forslag?',
      }).within(() => {
        cy.findByRole('radio', { name: 'Alltid' }).should('not.be.focused');
      });

      cy.findByRole('button', { name: /Du må fylle ut hører skolen på elevenes forslag/ }).click();

      cy.findByRole('radiogroup', {
        name: 'Spørsmål Hører skolen på elevenes forslag? * Du må fylle ut hører skolen på elevenes forslag?',
      }).within(() => {
        cy.findByRole('radio', { name: 'Alltid' }).should('be.focused');
      });
    });

    it('Existing validations should not disappear when a backend validator is not executed', () => {
      cy.goto('changename');
      cy.get(appFrontend.changeOfName.newFirstName).type('test');
      cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newFirstName)).should(
        'have.text',
        texts.testIsNotValidValue,
      );

      cy.intercept('PATCH', '**/data/**', (req) =>
        req.reply((res) => res.send(JSON.stringify({ ...res.body, validationIssues: {} }))),
      ).as('patchData');

      cy.get(appFrontend.changeOfName.newMiddleName).type('hei');
      cy.wait('@patchData');

      cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newFirstName)).should(
        'have.text',
        texts.testIsNotValidValue,
      );
    });

    it('Datepicker should show component validation instead of format error from schema', () => {
      cy.interceptLayout('changename', (component) => {
        if (component.type === 'Datepicker' && component.id === 'dateOfEffect') {
          component.showValidations = ['AllExceptRequired'];
        }
      });

      cy.goto('changename');
      cy.waitForLoad();

      let c = 0;
      cy.intercept('PATCH', '**/data/**', () => {
        c++;
      }).as('patchData');

      cy.get(appFrontend.changeOfName.dateOfEffect).type('01012020');
      cy.wait('@patchData').then(() => {
        expect(c).to.be.eq(1);
      });

      cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.dateOfEffect)).should('not.exist');

      cy.get(appFrontend.changeOfName.dateOfEffect).clear();
      cy.get(appFrontend.changeOfName.dateOfEffect).type('45451234');
      cy.wait('@patchData').then(() => {
        expect(c).to.be.eq(2);
      });

      cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.dateOfEffect)).should(
        'contain.text',
        'Ugyldig datoformat',
      );
      cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.dateOfEffect)).should(
        'not.contain.text',
        'Feil format',
      );
    });

    it('should not show required validation when data is invalid and not saveable', () => {
      cy.interceptLayout('changename', (component) => {
        if (component.type === 'Input' && component.id === 'int32AsNumber') {
          component.showValidations = ['All'];
          component.required = true;
        }
      });

      // Prevent patch response from setting the value to zero when empty
      cy.intercept('PATCH', '**/data/**', (req) => {
        req.on('response', (res) => {
          const body = res.body as IDataModelPatchResponse;
          if (body.newDataModel['Numeric']?.Int32 === 0) {
            delete body.newDataModel['Numeric'].Int32;
          }
        });
      });

      cy.goto('changename');

      cy.findByRole('checkbox', { name: /tall-input/i }).check();
      cy.gotoNavPage('numeric-fields');

      cy.get(appFrontend.fieldValidation('int32AsNumber')).should('contain.text', 'Du må fylle ut int32');

      cy.findByRole('textbox', { name: /int32.*/i }).type('999999999999999');
      cy.get(appFrontend.fieldValidation('int32AsNumber')).should('contain.text', 'Feil format eller verdi');
      cy.get(appFrontend.fieldValidation('int32AsNumber')).should('not.contain.text', 'Du må fylle ut int32');
    });
  });
});
