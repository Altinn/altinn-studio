import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Datepicker component', () => {
  it('using min and max date with expression', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Datepicker');

    const minDatePicker = '[id=DatepickerMinDateExample1]';
    const maxDatePicker = '[id=DatepickerMaxDateExample1]';
    const datePicker = '[data-componentid=DatepickerExample1]';

    cy.get(minDatePicker);
    cy.get(minDatePicker).type('02.07.2025');
    cy.get(minDatePicker).blur();

    cy.get(maxDatePicker).type('30.07.2025');
    cy.get(maxDatePicker).blur();

    cy.get(datePicker).contains('button', 'Åpne datovelger').click();

    cy.findByRole('combobox', { name: /velg måned/i }).select('juli');
    cy.findByRole('combobox', { name: /velg år/i }).select('2025');

    cy.findByRole('button', { name: /tirsdag 1. juli 2025/i }).should('be.disabled');
    cy.findByRole('button', { name: /torsdag 31. juli 2025/i }).should('be.disabled');
    cy.findByRole('button', { name: /fredag 4. juli 2025/i }).should('not.be.disabled');
    cy.findByRole('button', { name: /fredag 4. juli 2025/i }).click();
    cy.get(datePicker).findByRole('textbox').should('have.value', '04/07/2025');
  });
});
