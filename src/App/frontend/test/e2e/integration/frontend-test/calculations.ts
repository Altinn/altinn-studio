import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { interceptAltinnAppGlobalData } from 'test/e2e/support/intercept-global-data';

const appFrontend = new AppFrontend();

function assertChanges(row: string, total: string = row) {
  cy.findByLabelText(/^Calculated change/).should('have.text', row);
  cy.findByLabelText(/^Total change/).should('have.text', total);
}

function saveAndReturn() {
  cy.gotoNavPage('Kjæledyr');
  cy.gotoNavPage('repeating');
  cy.get(appFrontend.group.row(0).editBtn).click();
}

describe('Expression calculations stored in the data model', () => {
  it('shows calculations before saving, persists them, and handles empty, negative and normalized inputs', () => {
    // Defer saving until navigation so the displayed results prove that calculations run in the frontend.
    interceptAltinnAppGlobalData((data) => {
      data.ui.settings!.autoSaveBehavior = 'onChangePage';
    });
    cy.goto('group');
    cy.gotoNavPage('repeating');
    cy.findByLabelText(/^Total change/).should('have.text', 'NOK 0');
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.row(0).currentValue).numberFormatReplace('10');
    cy.get(appFrontend.group.row(0).newValue).numberFormatReplace('40');
    assertChanges('NOK 30');

    cy.gotoNavPage('Kjæledyr');
    cy.reload();
    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.row(0).editBtn).click();
    assertChanges('NOK 30');

    cy.get(appFrontend.group.row(0).currentValue).numberFormatReplace('100');
    cy.get(appFrontend.group.row(0).newValue).numberFormatReplace('25');
    assertChanges('-NOK 75');
    cy.get(appFrontend.group.row(0).newValue).numberFormatReplace('100');
    assertChanges('NOK 0');
    cy.get(appFrontend.group.row(0).newValue).clear();
    assertChanges('-NOK 100');

    cy.get(appFrontend.group.row(0).newValue).numberFormatReplace('25');
    // The test app normalizes 1337 to 1338 when saving.
    cy.get(appFrontend.group.row(0).currentValue).numberFormatReplace('1337');
    assertChanges('-NOK 1 312');
    saveAndReturn();
    cy.get(appFrontend.group.row(0).currentValue).should('have.value', 'NOK 1 338');
    assertChanges('-NOK 1 313');

    cy.get(appFrontend.group.saveMainGroup).click();
    cy.get(appFrontend.group.row(0).deleteBtn).click();
    cy.findByLabelText(/^Total change/).should('have.text', 'NOK 0');
    cy.findByLabelText(/^Calculated change/).should('not.exist');
    cy.gotoNavPage('Kjæledyr');
    cy.reload();
    cy.gotoNavPage('repeating');
    cy.findByLabelText(/^Total change/).should('have.text', 'NOK 0');
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').should('have.length', 0);

    cy.gotoNavPage('prefill');
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.liten }).check();
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.middels }).check();
    cy.gotoNavPage('repeating');
    cy.findByLabelText(/^Total change/).should('have.text', 'NOK 234');
    cy.findByRole('button', { name: 'Se innhold NOK 1' }).click();
    assertChanges('NOK 4', 'NOK 234');
    cy.gotoNavPage('Kjæledyr');
  });
});
