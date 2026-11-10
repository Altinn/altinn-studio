import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import type { FormBootstrapResponse } from 'src/features/formBootstrap/types';

const appFrontend = new AppFrontend();

function startTask(task: string) {
  // Keep the app HTML, bootstrap, active instances and resource responses untouched.
  cy.startAppInstance(appFrontend.apps.frontendTest);
  cy.get('#new-instance-button, #finishedLoading').should('exist');
  cy.get('body').then(($body) => {
    if ($body.find('#new-instance-button').length) {
      cy.get(appFrontend.selectInstance.newInstance).click();
    }
  });
  cy.get('#finishedLoading').should('exist');
  cy.findByRole('button', { name: 'Velg neste steg' }).click();
  cy.findByRole('radio', { name: task }).click();
  cy.findByRole('button', { name: 'Gå til' }).click();
  cy.get('#finishedLoading').should('exist');
}

describe('App files with comments and trailing commas', () => {
  it('uses real metadata, settings, layouts, text, footer, schema and asset files in the browser', () => {
    startTask('Endring av navn (Task_2)');
    cy.get(appFrontend.languageSelector).should('be.visible').click();
    cy.findByRole('menuitemradio', { name: 'Engelsk' }).should('exist');
    cy.get(appFrontend.languageSelector).click();
    cy.get('footer').should('contain.text', 'Frontend Test');
    cy.findByRole('link', { name: /hjelp@etaten.no/i }).should('have.attr', 'href', 'mailto:hjelp@etaten.no');
    cy.get('html').should('have.attr', 'data-json-config-assets', 'loaded');
    cy.document().should((document) => {
      expect(getComputedStyle(document.documentElement).getPropertyValue('--json-config-assets').trim()).to.eq(
        'loaded',
      );
    });

    cy.get(appFrontend.changeOfName.newFirstName).type('a');
    cy.findByRole('tab', { name: 'Nytt etternavn' }).click();
    cy.get(appFrontend.changeOfName.newLastName).type('client');
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.newLastName)).should('have.text', texts.clientSide);
  });

  it('loads file-backed options and evaluates and persists the real calculation and validation rules', () => {
    cy.intercept('GET', '**/bootstrap-form/Task_3*').as('formBootstrap');
    startTask('Repeterende grupper (Task_3)');
    cy.wait('@formBootstrap').then(({ response }) => {
      expect(response?.statusCode).to.eq(200);
      expect(response?.body.staticOptions['pet-species'].options).to.deep.include({
        label: 'Species.Dog',
        value: 'Dog',
        description: 'Species.Dog.Desc',
        helpText: 'Species.Dog.Help',
      });
    });
    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.row(0).currentValue).numberFormatReplace('10');
    cy.get(appFrontend.group.row(0).newValue).numberFormatReplace('40');
    cy.findByLabelText(/^Calculated change/).should('have.text', 'NOK 30');
    cy.findByLabelText(/^Total change/).should('have.text', 'NOK 30');
    cy.waitUntilSaved();

    cy.get<{ response: { body: FormBootstrapResponse }; request: { url: string } }>('@formBootstrap').then(
      ({ response, request }) => {
        const instanceUrl = request.url.split('/bootstrap-form/')[0];
        const dataElementId = response.body.dataModels['nested-group'].dataElementId;
        cy.request({ url: `${instanceUrl}/data/${dataElementId}`, headers: { Accept: 'application/json' } }).then(
          ({ headers, body }) => {
            expect(headers['content-type']).to.contain('application/json');
            expect(body.sumAll).to.eq(30);
          },
        );
      },
    );
    cy.reload();
    cy.get('#finishedLoading').should('exist');
    cy.findByLabelText(/^Total change/).should('have.text', 'NOK 30');
    cy.get(appFrontend.group.row(0).editBtn).click();
    cy.get('#useBothRepGroups').findByRole('radio', { name: 'Ja' }).check();
    cy.get(appFrontend.group.row(0).currentValue).numberFormatReplace('88889');
    cy.get(appFrontend.fieldValidation('currentValue-0')).should('contain.text', 'Det er teit å endre fra 88889');
    cy.waitUntilSaved();

    cy.gotoNavPage('Kjæledyr');
    cy.get(appFrontend.pets.decisionPanel.manualButton).click();
    cy.get(appFrontend.pets.group().addButton).click();
    cy.dsSelect(appFrontend.pets.group().editContainer.species, /^Hund /);
    cy.get(appFrontend.pets.group().editContainer.species).should('have.value', 'Hund');
  });
});
