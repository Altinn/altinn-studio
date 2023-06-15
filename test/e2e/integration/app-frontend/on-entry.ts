import { v4 as uuidv4 } from 'uuid';

import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('On Entry', () => {
  const instanceIdExamples = [`512345/${uuidv4()}`, `512345/${uuidv4()}`, `512345/${uuidv4()}`];
  beforeEach(() => {
    cy.intercept('**/active', [
      {
        id: instanceIdExamples[0],
        lastChanged: '2021-04-06T14:11:02.6893987Z',
        lastChangedBy: 'Ola Nordmann',
      },
      {
        id: instanceIdExamples[1],
        lastChanged: '2022-04-06T14:11:02.6893987Z',
        lastChangedBy: 'Foo Bar',
      },
      {
        id: instanceIdExamples[2],
        lastChanged: '2020-04-06T14:11:02.6893987Z',
        lastChangedBy: 'Bar Baz',
      },
    ]);
  });

  it('is possible to select an existing instance', () => {
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.closeButton).should('be.visible');
    cy.get(appFrontend.selectInstance.container).should('be.visible');
    cy.get(appFrontend.selectInstance.header).should('contain.text', texts.alreadyStartedForm);
    cy.get(appFrontend.selectInstance.description).should('contain.text', texts.continueOrStartNew);
    cy.get(appFrontend.selectInstance.tableBody).find('tr').should('have.length', instanceIdExamples.length);

    // Verify order of rows (they should be sorted with the latest instance at the bottom)
    cy.get(appFrontend.selectInstance.tableBody).find('tr').eq(0).should('contain.text', 'Bar Baz');
    cy.get(appFrontend.selectInstance.tableBody).find('tr').eq(1).should('contain.text', 'Ola Nordmann');
    cy.get(appFrontend.selectInstance.tableBody).find('tr').eq(2).should('contain.text', 'Foo Bar');

    cy.get(appFrontend.selectInstance.tableBody).find('tr').eq(1).as('tableRow');
    cy.get('@tableRow')
      .find('td')
      .eq(0)
      .contains(/04\/06\/2021|06.04.2021/g);
    cy.get('@tableRow').find('td').eq(1).should('have.text', 'Ola Nordmann');
    cy.snapshot('select-instance');

    // Click to begin working on one of our fake instances
    cy.get('@tableRow').find('td').eq(2).find('button').click();
    cy.url().should('contain', instanceIdExamples[0]);

    // The instance does not actually exist, we pretended it did by mocking
    // the response, so trying to fetch it will fail
    cy.get(appFrontend.instanceErrorCode).should('have.text', 'Ukjent feil');
  });

  it('is possible to create a new instance', () => {
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.closeButton).should('be.visible');
    cy.get(appFrontend.selectInstance.container).should('be.visible');
    cy.intercept('POST', `/ttd/frontend-test/instances?instanceOwnerPartyId*`).as('createdInstance');
    cy.get(appFrontend.selectInstance.newInstance).click();
    cy.wait('@createdInstance').its('response.statusCode').should('eq', 201);
    cy.url().should('not.contain', instanceIdExamples[0]);

    cy.get(appFrontend.instanceErrorCode).should('not.exist');
    cy.findByRole('heading', { name: /Appen for test av app frontend/i }).should('exist');
  });
});
