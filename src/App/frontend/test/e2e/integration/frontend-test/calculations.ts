import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { interceptAltinnAppGlobalData } from 'test/e2e/support/intercept-global-data';

const appFrontend = new AppFrontend();

const emptyAnnualWork = 'Enter positive persons and annual work to calculate a result.';
const allocationWarning = 'The completed allocation must add up to 100 percent.';

function setNumber(name: string, value: string) {
  cy.findByRole('textbox', { name }).numberFormatReplace(value);
  cy.findByRole('textbox', { name }).blur();
}

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

  it('updates dependent calculations and warnings, and allows saving after clearing a result', () => {
    cy.goto('group');
    cy.gotoNavPage('calculations');

    cy.findByRole('checkbox', { name: 'Feed' }).check();
    cy.findByRole('checkbox', { name: 'Compost' }).check();
    setNumber('Feed allocation', '60');
    cy.findByLabelText(/^Remaining allocation/).should('have.text', '40');
    cy.findByText(allocationWarning).should('not.exist');

    setNumber('Compost allocation', '20');
    cy.findByLabelText(/^Remaining allocation/).should('have.text', '20');
    cy.findByText(allocationWarning).should('be.visible');

    setNumber('Compost allocation', '40');
    cy.findByLabelText(/^Remaining allocation/).should('have.text', '0');
    cy.findByText(allocationWarning).should('not.exist');

    setNumber('Compost allocation', '0');
    cy.findByLabelText(/^Remaining allocation/).should('have.text', '40');
    cy.findByText(allocationWarning).should('be.visible');
    setNumber('Compost allocation', '');
    // The remainder stays the same, but blank is different from an explicitly entered zero.
    cy.findByText(allocationWarning).should('not.exist');
    cy.findByLabelText(/^Remaining allocation/).should('have.text', '40');

    cy.findByRole('checkbox', { name: 'Compost' }).uncheck();
    cy.findByText(allocationWarning).should('be.visible');
    setNumber('Feed allocation', '100');
    cy.findByLabelText(/^Remaining allocation/).should('have.text', '0');
    cy.findByText(allocationWarning).should('not.exist');

    cy.findByRole('radio', { name: 'Yes, calculate annual work' }).check();
    cy.findByText(emptyAnnualWork).should('be.visible');

    setNumber('Number of persons', '2');
    setNumber('Annual work', '1.5');
    cy.findByLabelText(/^Calculated annual work/).should('have.text', '1.5');

    setNumber('Annual work', '');
    cy.findByText(emptyAnnualWork).should('be.visible');

    setNumber('Annual work', '2.5');
    cy.findByLabelText(/^Calculated annual work/).should('have.text', '2.5');

    setNumber('Annual work', '');
    cy.findByText(emptyAnnualWork).should('be.visible');
    // A null result must let saving finish so the user can continue to the next page.
    cy.findByRole('button', { name: 'Neste' }).click();
    cy.findByRole('button', { name: /^\d+\. summary$/ }).should('have.attr', 'aria-current', 'page');
  });
});
