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
    cy.get(appFrontend.changeOfName.newFirstName)
      .should('be.visible')
      .focus()
      .type('Some value')
      .blur()
      .focus()
      .clear()
      .blur();
    cy.get(appFrontend.fieldValidationError.replace('field', appFrontend.changeOfName.newFirstName.substring(1)))
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.requiredFieldFromBackend);

    // Doing the same for any other field (without server-side required validation) should not show an error
    cy.get(appFrontend.changeOfName.newMiddleName)
      .should('be.visible')
      .focus()
      .type('Some value')
      .blur()
      .focus()
      .clear()
      .blur();
    cy.get(
      appFrontend.fieldValidationError.replace('field', appFrontend.changeOfName.newMiddleName.substring(1)),
    ).should('not.exist');

    cy.get(appFrontend.changeOfName.newFirstName).should('be.visible').focus().type('Some first name').blur();

    cy.get(appFrontend.changeOfName.newMiddleName).should('be.visible').focus().type('Some middle name').blur();

    cy.get(appFrontend.changeOfName.confirmChangeName).should('be.visible').find('input').check();
    cy.get(appFrontend.changeOfName.reasonRelationship).should('be.visible').click().type('test');
    cy.get(appFrontend.changeOfName.dateOfEffect)
      .siblings()
      .children(mui.buttonIcon)
      .click()
      .then(() => {
        cy.get(mui.selectedDate).should('be.visible').click();
      });

    cy.get(appFrontend.nextButton).click();

    cy.get(
      appFrontend.fieldValidationError.replace('field', appFrontend.changeOfName.newFirstName.substring(1)),
    ).should('not.exist');

    cy.get(
      appFrontend.fieldValidationError.replace('field', appFrontend.changeOfName.newMiddleName.substring(1)),
    ).should('not.exist');

    cy.get(appFrontend.fieldValidationError.replace('field', appFrontend.changeOfName.newLastName.substring(1)))
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.requiredFieldLastName);
  });

  it('Custom field validation - error', () => {
    cy.goto('changename');
    cy.intercept('GET', '**/validate').as('validateData');
    cy.get(appFrontend.changeOfName.newFirstName).should('be.visible').type('test').blur();
    cy.wait('@validateData');
    cy.get(appFrontend.fieldValidationError.replace('field', appFrontend.changeOfName.newFirstName.substring(1)))
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.testIsNotValidValue)
      .then((error) => {
        cy.wrap(error).find('a[href="https://www.altinn.no/"]').should('exist');
      });
  });

  it('Soft validation - warning', () => {
    cy.goto('changename');
    cy.intercept('GET', '**/validate').as('validateData');
    cy.get(appFrontend.changeOfName.newMiddleName).should('be.visible').type('test').blur();
    cy.wait('@validateData');
    cy.get(appFrontend.fieldValidationWarning.replace('field', appFrontend.changeOfName.newMiddleName.substring(1)))
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.testIsNotValidValue);
  });

  it('Soft validation - info', () => {
    cy.goto('changename');
    cy.intercept('GET', '**/validate').as('validateData');
    cy.get(appFrontend.changeOfName.newMiddleName).should('be.visible').type('info').blur();
    cy.wait('@validateData');
    cy.get(appFrontend.fieldValidationInfo.replace('field', appFrontend.changeOfName.newMiddleName.substring(1)))
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.infoMessage);
  });

  it('Soft validation - success', () => {
    cy.goto('changename');
    cy.intercept('GET', '**/validate').as('validateData');
    cy.get(appFrontend.changeOfName.newMiddleName).should('be.visible').type('success').blur();
    cy.wait('@validateData');
    cy.get(appFrontend.fieldValidationSuccess.replace('field', appFrontend.changeOfName.newMiddleName.substring(1)))
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.successMessage);
  });

  it('Page validation on clicking next', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).should('be.visible').clear().type('test').blur();
    cy.get(appFrontend.changeOfName.confirmChangeName).should('be.visible').find('input').check();
    cy.intercept('GET', '**/validate').as('validateData');
    cy.get(appFrontend.nextButton).should('be.visible').scrollIntoView();
    cy.get(appFrontend.nextButton).should('be.inViewport');
    cy.get(appFrontend.nextButton).click();
    cy.wait('@validateData');
    cy.get(appFrontend.errorReport)
      .parent()
      .should('exist')
      .should('be.visible')
      .should('be.inViewport')
      .should('contain.text', texts.errorReport)
      .should('contain.text', texts.requiredFieldLastName)
      .should('contain.text', texts.requiredFieldDateFrom);

    const lastNameError = appFrontend.fieldValidationError.replace(
      'field',
      appFrontend.changeOfName.newLastName.substring(1),
    );
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
      .should('be.visible')
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
    cy.get(appFrontend.fieldValidationError.replace('field', appFrontend.changeOfName.upload.substring(1)))
      .should('exist')
      .should('be.visible')
      .should('contain.text', texts.attachmentError);
  });

  it('Validation on uploaded attachment type with tag', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.uploadWithTag.uploadZone).selectFile('test/e2e/fixtures/test.pdf', { force: true });
    cy.get(appFrontend.changeOfName.uploadWithTag.saveTag).click({ multiple: true });
    cy.get(appFrontend.changeOfName.uploadWithTag.error)
      .should('exist')
      .should('be.visible')
      .should('not.contain.text', appFrontend.changeOfName.uploadWithTag.unwantedChar);
    cy.get('#toNextTask').click();
    cy.get(appFrontend.errorReport).should('not.contain.text', appFrontend.changeOfName.uploadWithTag.unwantedChar);
  });

  it('Client side validation from json schema', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newLastName).should('be.visible').type('client').blur();
    cy.get(appFrontend.fieldValidationError.replace('field', appFrontend.changeOfName.newLastName.substring(1)))
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.clientSide);
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
    cy.get(appFrontend.sendinButton).should('be.visible').click();
    cy.get(appFrontend.errorReport).should('exist').should('be.visible').should('contain.text', 'task validation');
  });

  it('Validations are removed for hidden fields', () => {
    // Init and add data to group
    cy.goto('group');
    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.group.showGroupToContinue).should('be.visible').find('input').check();
    cy.get(appFrontend.group.addNewItem).should('be.visible').click();
    cy.get(appFrontend.group.currentValue).should('be.visible').type('123');
    cy.get(appFrontend.group.newValue).should('be.visible').type('321');

    // Create validation error
    cy.get(appFrontend.group.mainGroup)
      .find(appFrontend.group.editContainer)
      .find(appFrontend.group.next)
      .should('be.visible')
      .click();
    cy.get(appFrontend.group.comments).type('test').blur();
    cy.get(appFrontend.fieldValidationError.replace('field', 'comments'))
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.testIsNotValidValue);
    cy.get(appFrontend.errorReport).should('exist').should('be.visible');

    // Hide field that contains validation error and verify validation messages are gone
    cy.get(appFrontend.group.hideCommentField).should('be.visible').find('input').check();
    cy.get(appFrontend.group.comments).should('not.exist');
    cy.get(appFrontend.fieldValidationError.replace('field', 'comments')).should('not.exist');
    cy.get(appFrontend.errorReport).should('not.exist');
  });
});
