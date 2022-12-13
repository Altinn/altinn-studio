import * as texts from 'test/e2e/fixtures/texts.json';
import AppFrontend from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('On Entry', () => {
  const instanceIdExample = '512345/58f1af2b-a90f-4828-8bf6-38fa24c51379';
  beforeEach(() => {
    cy.intercept('**/active', [
      {
        id: instanceIdExample,
        lastChanged: '2021-04-06T14:11:02.6893987Z',
        lastChangedBy: 'Ola Nordman',
      },
    ]);
  });

  it('is possible to select an existing instance', () => {
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.closeButton).should('be.visible');
    cy.get(appFrontend.selectInstance.container).should('be.visible');
    cy.get(appFrontend.selectInstance.header).should('be.visible').should('contain.text', texts.alreadyStartedForm);
    cy.get(appFrontend.selectInstance.description)
      .should('be.visible')
      .should('contain.text', texts.continueOrStartNew);
    cy.get(appFrontend.selectInstance.tableBody)
      .find('tr')
      .should('have.length', 1)
      .first()
      .then((activeInstance) => {
        cy.wrap(activeInstance)
          .find('td')
          .eq(0)
          .contains(/04\/06\/2021|06.04.2021/g);
        cy.wrap(activeInstance).find('td').eq(1).should('have.text', 'Ola Nordman');
        cy.wrap(activeInstance).find('td').eq(2).find('button').click();
        cy.url().should('contain', instanceIdExample);
      });
  });

  it('is possible to create a new instance', () => {
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.closeButton).should('be.visible');
    cy.get(appFrontend.selectInstance.container).should('be.visible');
    cy.intercept('POST', `/ttd/frontend-test/instances?instanceOwnerPartyId*`).as('createdInstance');
    cy.get(appFrontend.selectInstance.newInstance).should('be.visible').click();
    cy.wait('@createdInstance').its('response.statusCode').should('eq', 201);
    cy.url().should('not.contain', instanceIdExample);
  });
});
