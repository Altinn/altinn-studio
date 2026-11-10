import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();
const componentError = 'Component-only error for BAD123';
const subformError = 'Det er feil i en eller flere moped oppføringer';
const taskError = 'Task-wide component error';
const table = '#subform-subform-mopeder-table';

function addMoped(regNo: string, model: string) {
  cy.get('#subform-subform-mopeder-add-button').click();
  cy.get('#moped-regno').type(regNo);
  cy.get('#moped-merke').type('Digdir');
  cy.get('#moped-modell').type(model);
  cy.get('#moped-produksjonsaar').type('2024');
  cy.waitUntilSaved();
  cy.get('#custom-button-subform-moped-cancelButton').clickAndGone();
  cy.get(table).should('be.visible');
}

function continueAndExpectValidations() {
  cy.findByRole('button', { name: /^Neste$/ }).click();
  cy.get(appFrontend.errorReport).should('be.visible');
}

function submitAndExpectReceipt() {
  cy.findByRole('button', { name: /^Neste$/ }).click();
  cy.findByRole('button', { name: /^Send inn$/ }).click();
  cy.get('#ReceiptContainer').should('contain.text', 'Skjemaet er sendt inn');
}

describe('Component validation', () => {
  it('shows errors on the right components and allows submission after correction', () => {
    cy.startAppInstance(appFrontend.apps.subformTest, { authenticationLevel: '1' });
    cy.get('#Input-Name').type('Per');
    cy.get('#Input-Age').type('28');
    addMoped('BAD123', 'component-error');
    addMoped('GOOD123', 'Scooter');

    // Component-only errors belong to one subform entry.
    continueAndExpectValidations();
    cy.get(appFrontend.errorReport).findByRole('button', { name: subformError }).click();
    cy.get(appFrontend.fieldValidation('subform-mopeder')).should('contain.text', subformError);
    cy.get(appFrontend.errorReport, { timeout: 0 }).should('not.contain.text', componentError);

    cy.get(table).findAllByRole('button', { name: 'Endre' }).eq(1).click();
    cy.get('#moped-modell').should('have.value', 'Scooter');
    cy.get(appFrontend.fieldValidation('moped-modell'), { timeout: 0 }).should('not.exist');
    cy.get(appFrontend.errorReport, { timeout: 0 }).should('not.exist');
    cy.get('#custom-button-subform-moped-exitButton').clickAndGone();
    cy.get(table).should('be.visible');
    cy.get(appFrontend.fieldValidation('subform-mopeder')).should('contain.text', subformError);
    cy.get(appFrontend.errorReport).findByRole('button', { name: subformError }).should('be.visible');
    cy.get(appFrontend.errorReport, { timeout: 0 }).should('not.contain.text', componentError);

    cy.get(table).findAllByRole('button', { name: 'Endre' }).eq(0).click();
    cy.get(appFrontend.fieldValidation('moped-modell')).should('contain.text', componentError);
    cy.get(appFrontend.errorReport).findByRole('button', { name: componentError }).click();
    cy.focused().should('have.attr', 'id', 'moped-modell');
    cy.get('#moped-modell').clear();
    cy.get('#moped-modell').type('Scooter');
    cy.waitUntilSaved();
    cy.get(appFrontend.errorReport).should('not.exist');
    cy.get('#custom-button-subform-moped-exitButton').clickAndGone();
    cy.get(table).should('be.visible');
    cy.get(appFrontend.errorReport, { timeout: 0 }).should('not.exist');

    // Task-wide issues without a data element ID still link to a matching component.
    cy.get('#Input-Name').clear();
    cy.get('#Input-Name').type('task-component-error');
    continueAndExpectValidations();
    cy.get(appFrontend.fieldValidation('Input-Name')).should('contain.text', taskError);
    cy.get(appFrontend.errorReport).findByRole('button', { name: taskError }).click();
    cy.focused().should('have.attr', 'id', 'Input-Name');

    cy.get(table).findAllByRole('button', { name: 'Endre' }).eq(1).click();
    cy.get('#moped-modell').should('have.value', 'Scooter');
    cy.get(appFrontend.errorReport, { timeout: 0 }).should('not.exist');
    cy.get('#custom-button-subform-moped-exitButton').clickAndGone();
    cy.get(appFrontend.fieldValidation('Input-Name')).should('contain.text', taskError);
    cy.get(appFrontend.errorReport).findByRole('button', { name: taskError }).should('be.visible');
    cy.get('#Input-Name').clear();
    cy.get('#Input-Name').type('Per');
    cy.get(appFrontend.errorReport).should('not.exist');

    // When the component is missing, submission shows an unlinked error that can still be corrected.
    cy.get('#Input-Name').clear();
    cy.get('#Input-Name').type('task-unbound-error');
    cy.findByRole('button', { name: /^Neste$/ }).click();
    cy.findByRole('button', { name: /^Send inn$/ }).click();
    cy.get(appFrontend.errorReport).should('be.visible').and('contain.text', taskError);
    cy.get(appFrontend.errorReport).findByRole('button', { name: taskError, timeout: 0 }).should('not.exist');
    cy.findByRole('button', { name: /^Send inn$/ }).should('be.visible');
    cy.get('#custom-button-hovedskjema-backButton').click();
    cy.get('#Input-Name').clear();
    cy.get('#Input-Name').type('Per');
    cy.get(appFrontend.errorReport).should('not.exist');
    submitAndExpectReceipt();
  });
});
