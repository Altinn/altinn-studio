import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Common } from 'test/e2e/pageobjects/common';

const appFrontend = new AppFrontend();
const mui = new Common();

describe('Validation', () => {
  it('Required field validation should be visible on submit, not on blur', () => {
    cy.goto('changename');

    // This field has server-side validations marking it as required, overriding the frontend validation functionality
    // which normally postpones the empty fields validation until the page validation runs. We need to type something,
    // send it to the server and clear the value to show this validation error.
    cy.get(appFrontend.changeOfName.newFirstName).type('Some value');
    cy.get(appFrontend.changeOfName.newFirstName).blur();
    cy.get(appFrontend.changeOfName.newFirstName).clear();
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newFirstName)).should(
      'have.text',
      texts.requiredFieldFromBackend,
    );

    // Doing the same for any other field (without server-side required validation) should not show an error
    cy.get(appFrontend.changeOfName.newMiddleName).type('Some value');
    cy.get(appFrontend.changeOfName.newMiddleName).blur();
    cy.get(appFrontend.changeOfName.newMiddleName).focus();
    cy.get(appFrontend.changeOfName.newMiddleName).clear();
    cy.get(appFrontend.changeOfName.newMiddleName).blur();
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newMiddleName)).should('not.exist');

    cy.get(appFrontend.changeOfName.newFirstName).type('Some first name');
    cy.get(appFrontend.changeOfName.newMiddleName).type('Some middle name');

    cy.get(appFrontend.changeOfName.confirmChangeName).find('input').dsCheck();
    cy.get(appFrontend.changeOfName.reasonRelationship).type('test');
    cy.get(appFrontend.changeOfName.dateOfEffect).siblings().children(mui.buttonIcon).click();
    cy.get(mui.selectedDate).click();

    cy.get(appFrontend.nextButton).click();

    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newFirstName)).should('not.exist');
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newMiddleName)).should('not.exist');
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newLastName)).should(
      'have.text',
      texts.requiredFieldLastName,
    );
  });

  it('Custom field validation - error', () => {
    cy.goto('changename');
    cy.intercept('GET', '**/validate').as('validateData');
    cy.get(appFrontend.changeOfName.newFirstName).type('test');
    cy.wait('@validateData');
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newFirstName))
      .should('have.text', texts.testIsNotValidValue)
      .then((error) => {
        cy.wrap(error).find('a[href="https://www.altinn.no/"]').should('exist');
      });
  });

  it('Soft validation - warning', () => {
    cy.goto('changename');
    cy.intercept('GET', '**/validate').as('validateData');
    cy.get(appFrontend.changeOfName.newMiddleName).type('test');
    cy.wait('@validateData');
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newMiddleName, 'warning')).should(
      'have.text',
      texts.testIsNotValidValue,
    );
  });

  it('Soft validation - info', () => {
    cy.goto('changename');
    cy.intercept('GET', '**/validate').as('validateData');
    cy.get(appFrontend.changeOfName.newMiddleName).type('info');
    cy.wait('@validateData');
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newMiddleName, 'info')).should(
      'have.text',
      texts.infoMessage,
    );
  });

  it('Soft validation - success', () => {
    cy.goto('changename');
    cy.intercept('GET', '**/validate').as('validateData');
    cy.get(appFrontend.changeOfName.newMiddleName).type('success');
    cy.wait('@validateData');
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newMiddleName, 'success')).should(
      'have.text',
      texts.successMessage,
    );
  });

  it('Page validation on clicking next', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).clear();
    cy.get(appFrontend.changeOfName.newFirstName).type('test');
    cy.get(appFrontend.changeOfName.confirmChangeName).find('input').dsCheck();
    cy.intercept('GET', '**/validate').as('validateData');
    cy.get(appFrontend.nextButton).scrollIntoView();
    cy.get(appFrontend.nextButton).should('be.inViewport');
    cy.get(appFrontend.nextButton).click();
    cy.wait('@validateData');
    cy.get(appFrontend.errorReport)
      .should('be.inViewport')
      .should('contain.text', texts.errorReport)
      .should('contain.text', texts.requiredFieldLastName)
      .should('contain.text', texts.requiredFieldDateFrom)
      .should('contain.text', texts.next);

    // Make sure all the buttons in the form are now inside errorReport, not outside of it.
    // - 4 of the button roles belong to each of the errors in the report
    // - 3 of the button roles belong to the buttons on the bottom of the form (print, next, jump)
    cy.get(appFrontend.errorReport)
      .findAllByRole('button')
      .should('have.length', 4 + 3);

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
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.upload)).should('contain.text', texts.attachmentError);
  });

  it('Validation on uploaded attachment type with tag', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.uploadWithTag.uploadZone).selectFile('test/e2e/fixtures/test.pdf', { force: true });
    cy.get(appFrontend.changeOfName.uploadWithTag.saveTag).click({ multiple: true });
    cy.get(appFrontend.changeOfName.uploadWithTag.error).should(
      'not.contain.text',
      appFrontend.changeOfName.uploadWithTag.unwantedChar,
    );
    cy.get('#toNextTask').click();
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
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newMiddleName)).should(
      'contain.text',
      `The field value must be a string or array type with a maximum length of '50'`,
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
        text: 'Bruk 60 eller færre tegn',
        shouldFocus: 'changeNameTo_æøå',
      },
      {
        text: 'Du må fylle ut dato for navneendring',
        shouldFocus: 'dateOfEffect',
      },
      {
        text: 'Du må fylle ut bekreftelse av navn',
        shouldFocus: 'confirmChangeName',
      },
    ];

    // Clicking the submit button should display all validation errors on the bottom, and clicking them
    // should move focus to the correct elements in the form.
    cy.get('#toNextTask').click();
    cy.get(appFrontend.errorReport).find('li').should('have.length', expectedErrors.length);
    for (const { text, shouldFocus } of expectedErrors) {
      cy.get(appFrontend.errorReport).should('contain.text', text);
      cy.get(`button:contains("${text}")`).click();
      cy.focused().closest('[data-componentid]').should('have.attr', 'data-componentid', shouldFocus);
    }
  });

  it('Task validation', () => {
    cy.intercept('**/active', []).as('noActiveInstances');
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.closeButton).should('be.visible');
    cy.intercept('GET', '**/validate', [
      {
        severity: 1,
        code: 'error',
        description: 'task validation',
      },
    ]);
    cy.get(appFrontend.sendinButton).click();
    cy.get(appFrontend.errorReport).should('contain.text', 'task validation');
  });

  it('Validations are removed for hidden fields', () => {
    // Init and add data to group
    cy.goto('group');
    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.currentValue).type('123');
    cy.get(appFrontend.group.newValue).type('321');

    // Create validation error
    cy.get(appFrontend.group.mainGroup).find(appFrontend.group.editContainer).find(appFrontend.group.next).click();
    cy.get(appFrontend.group.comments).type('test');
    cy.get(appFrontend.fieldValidation('comments')).should('have.text', texts.testIsNotValidValue);
    cy.get(appFrontend.errorReport).should('exist').should('be.visible');

    // Hide field that contains validation error and verify validation messages are gone
    cy.get(appFrontend.group.hideCommentField).find('input').dsCheck();
    cy.get(appFrontend.group.comments).should('not.exist');
    cy.get(appFrontend.fieldValidation('comments')).should('not.exist');
    cy.get(appFrontend.errorReport).should('not.exist');
  });

  it('Validation messages should only show up once', () => {
    cy.goto('datalist');
    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.errorReport)
      .should('be.inViewport')
      .should('contain.text', texts.errorReport)
      .should('contain.text', texts.next);
    cy.get(appFrontend.errorReport).find('li:contains("Du må fylle ut hvem gjelder saken?")').should('have.length', 1);
  });
});
